import { useCallback } from 'react'
import { LUMA } from '../config/luma'
import { getHealth, recordGenerationCloud, uploadKeyframe } from '../cloud/storageClient'
import { nextFrame } from '../lib/captureCanvas'
import { uid } from '../lib/uid'
import { useEditorStore } from '../state/useEditorStore'
import type { Scene } from '../types/project'
import { buildScenePrompt } from './buildPrompt'
import { compileMovie } from './compileMovie'
import { createGeneration, pollUntilDone, type Keyframe } from './lumaClient'

/**
 * Orchestrates the Generate Movie pipeline:
 *   1. (sequential) for each scene: switch to it, capture keyframes, upload them.
 *   2. (concurrent, capped) create a Luma image-to-video generation per scene
 *      and poll to completion.
 *   3. compile all completed clips into one MP4.
 *
 * Capture must be sequential (only one scene is "active"/rendered at a time);
 * generation/polling fan out up to `LUMA.concurrency`.
 */
export function useMovieGeneration() {
  const run = useCallback(async () => {
    const store = useEditorStore.getState()
    const { project, captureFn, selectScene, setSceneGen, resetGenerations } = store

    if (!captureFn) throw new Error('Renderer not ready for capture')
    const health = await getHealth()
    if (!health.storage) {
      throw new Error('S3 storage not configured — set AWS_REGION + S3_BUCKET in .env')
    }

    resetGenerations()
    const scenes = project.scenes
    const originalActive = project.activeSceneId

    // --- Phase 1: capture + upload (sequential) ---
    const prepared: { scene: Scene; frame0: Keyframe; frame1?: Keyframe }[] = []
    for (const scene of scenes) {
      try {
        setSceneGen(scene.id, { status: 'capturing' })
        selectScene(scene.id)
        await nextFrame()
        await nextFrame()
        await sleep(180) // let terrain/objects/characters settle

        const frames = await useEditorStore.getState().captureFn!()
        setSceneGen(scene.id, { thumbDataUrl: frames.frame0, status: 'uploading' })

        const stamp = Date.now()
        const frame0Url = await uploadKeyframe(frames.frame0, `${scene.id}-${stamp}-0.jpg`)
        const frame1Url = frames.frame1
          ? await uploadKeyframe(frames.frame1, `${scene.id}-${stamp}-1.jpg`)
          : undefined
        setSceneGen(scene.id, { frame0Url, frame1Url })

        prepared.push({
          scene,
          frame0: { type: 'image', url: frame0Url },
          frame1: frame1Url ? { type: 'image', url: frame1Url } : undefined,
        })
      } catch (e) {
        setSceneGen(scene.id, { status: 'failed', error: msg(e) })
      }
    }
    selectScene(originalActive)

    // --- Phase 2: generate + poll (concurrent, capped) ---
    await pool(prepared, LUMA.concurrency, async ({ scene, frame0, frame1 }) => {
      try {
        setSceneGen(scene.id, { status: 'queued' })
        const keyframes = frame1 ? { frame0, frame1 } : { frame0 }
        const gen = await createGeneration({
          prompt: buildScenePrompt(scene, project),
          // With both keyframes Luma requires loop:false.
          loop: false,
          keyframes,
        })
        setSceneGen(scene.id, { generationId: gen.id, status: 'dreaming' })
        const done = await pollUntilDone(gen.id, (state) =>
          setSceneGen(scene.id, { status: state === 'completed' ? 'completed' : 'dreaming' }),
        )
        const videoUrl = done.assets?.video ?? undefined
        setSceneGen(scene.id, { status: 'completed', videoUrl })
        // Best-effort history write to Aurora (no-op if not configured).
        void recordGenerationCloud({
          id: uid('gen'),
          projectId: project.id,
          sceneId: scene.id,
          prompt: buildScenePrompt(scene, project),
          lumaId: gen.id,
          videoUrl,
          status: 'completed',
        })
      } catch (e) {
        setSceneGen(scene.id, { status: 'failed', error: msg(e) })
      }
    })
  }, [])

  /**
   * Populate storyboard thumbnails fast — captures the start frame of each
   * scene. The currently-active scene is captured first (instant, no switch);
   * the rest follow after a brief settle. Cheap and side-effect-light.
   */
  const captureThumbnails = useCallback(async () => {
    const { project, captureFn, selectScene, setSceneGen, generations } = useEditorStore.getState()
    if (!captureFn) return
    const original = project.activeSceneId
    // Active scene first so something appears immediately.
    const ordered = [...project.scenes].sort((a, b) =>
      a.id === original ? -1 : b.id === original ? 1 : 0,
    )
    for (const scene of ordered) {
      if (generations[scene.id]?.thumbDataUrl) continue // already have one
      const isActive = scene.id === useEditorStore.getState().project.activeSceneId
      if (!isActive) {
        selectScene(scene.id)
        await nextFrame()
        await nextFrame()
        await sleep(120)
      }
      try {
        const frames = await useEditorStore.getState().captureFn!()
        setSceneGen(scene.id, { thumbDataUrl: frames.frame0 })
      } catch {
        /* ignore — card stays a placeholder */
      }
    }
    selectScene(original)
  }, [])

  const compile = useCallback(async () => {
    const { project, generations, setCompile } = useEditorStore.getState()
    const urls = project.scenes
      .map((s) => generations[s.id]?.videoUrl)
      .filter((u): u is string => Boolean(u))
    if (urls.length === 0) {
      setCompile({ status: 'failed', error: 'No completed clips to compile' })
      return
    }
    try {
      setCompile({ status: 'loading', progress: 0, error: undefined })
      const url = await compileMovie(urls, (p) =>
        useEditorStore.getState().setCompile({ status: 'compiling', progress: p }),
      )
      setCompile({ status: 'done', progress: 1, url })
    } catch (e) {
      setCompile({ status: 'failed', error: msg(e) })
    }
  }, [])

  /** Full one-tap pipeline: generate all scenes, then compile. */
  const generateMovie = useCallback(async () => {
    await run()
    await compile()
  }, [run, compile])

  return { generateMovie, run, compile, captureThumbnails }
}

function msg(e: unknown) {
  return e instanceof Error ? e.message : 'failed'
}
function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

/** Run `task` over items with a max concurrency. */
async function pool<T>(items: T[], size: number, task: (item: T) => Promise<void>) {
  let i = 0
  const workers = Array.from({ length: Math.min(size, items.length) }, async () => {
    while (i < items.length) {
      const item = items[i++]
      await task(item)
    }
  })
  await Promise.all(workers)
}
