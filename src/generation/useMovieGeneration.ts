import { useCallback } from 'react'
import { FAL } from '../config/fal'
import { recordGenerationCloud } from '../cloud/storageClient'
import { nextFrame } from '../lib/captureCanvas'
import { uid } from '../lib/uid'
import { useEditorStore } from '../state/useEditorStore'
import type { Scene } from '../types/project'
import { buildScenePrompt } from './buildPrompt'
import { compileMovie } from './compileMovie'
import { createGeneration, pollUntilDone, uploadImage } from './falClient'

/**
 * Orchestrates the Generate Movie pipeline:
 *   1. (sequential) for each scene: switch to it, capture a keyframe, upload it.
 *   2. (concurrent, capped) create a fal.ai image→video generation per scene
 *      and poll to completion.
 *   3. compile all completed clips into one MP4.
 *
 * Capture must be sequential (only one scene is "active"/rendered at a time);
 * generation/polling fan out up to `FAL.concurrency`.
 */
const cancelled = () => useEditorStore.getState().genCancelled

export function useMovieGeneration() {
  /** Run the pipeline over all scenes, or just `sceneIds` (retry of failures). */
  const run = useCallback(async (sceneIds?: string[]) => {
    const store = useEditorStore.getState()
    const { project, captureFn, selectScene, setSceneGen, resetGenerations } = store

    if (!captureFn) throw new Error('Renderer not ready for capture')

    if (sceneIds) useEditorStore.setState({ genCancelled: false })
    else resetGenerations()
    const scenes = sceneIds
      ? project.scenes.filter((s) => sceneIds.includes(s.id))
      : project.scenes
    const originalActive = project.activeSceneId

    // --- Phase 1: capture + upload (sequential) ---
    const prepared: { scene: Scene; imageUrl: string }[] = []
    for (const scene of scenes) {
      if (cancelled()) break
      try {
        setSceneGen(scene.id, { status: 'capturing' })
        selectScene(scene.id)
        await nextFrame()
        await nextFrame()
        await sleep(180) // let terrain/objects/characters settle

        const frames = await useEditorStore.getState().captureFn!()
        setSceneGen(scene.id, { thumbDataUrl: frames.frame0, status: 'uploading' })

        // Host the keyframe on fal storage (fal-readable, HEAD-able).
        const imageUrl = await uploadImage(frames.frame0)
        setSceneGen(scene.id, { frame0Url: imageUrl })
        prepared.push({ scene, imageUrl })
      } catch (e) {
        setSceneGen(scene.id, { status: 'failed', error: msg(e) })
      }
    }
    selectScene(originalActive)

    // --- Phase 2: generate + poll (concurrent, capped) ---
    await pool(prepared, FAL.concurrency, async ({ scene, imageUrl }) => {
      if (cancelled()) {
        setSceneGen(scene.id, { status: 'failed', error: 'Cancelled' })
        return
      }
      try {
        setSceneGen(scene.id, { status: 'queued' })
        const prompt = buildScenePrompt(scene, project)
        const sub = await createGeneration({ prompt, imageUrl })
        setSceneGen(scene.id, { generationId: sub.request_id, status: 'dreaming' })
        const { videoUrl } = await pollUntilDone(
          sub,
          (state) => setSceneGen(scene.id, { status: state === 'completed' ? 'completed' : 'dreaming' }),
          cancelled,
        )
        // A "completed" job with no video URL is a failure — don't silently drop it.
        if (!videoUrl) {
          setSceneGen(scene.id, { status: 'failed', error: 'fal returned no video' })
          return
        }
        setSceneGen(scene.id, { status: 'completed', videoUrl })
        // Best-effort history write to Aurora (no-op if not configured).
        void recordGenerationCloud({
          id: uid('gen'),
          projectId: project.id,
          sceneId: scene.id,
          prompt,
          lumaId: sub.request_id,
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
    if (cancelled()) {
      setCompile({ status: 'failed', error: 'Cancelled' })
      return
    }
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
    if (!cancelled()) await compile()
  }, [run, compile])

  /** Re-run only the scenes that failed, then re-compile. */
  const retryFailed = useCallback(async () => {
    const { project, generations } = useEditorStore.getState()
    const failed = project.scenes.filter((s) => generations[s.id]?.status === 'failed').map((s) => s.id)
    if (!failed.length) return
    await run(failed)
    if (!cancelled()) await compile()
  }, [run, compile])

  return { generateMovie, run, compile, captureThumbnails, retryFailed }
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
