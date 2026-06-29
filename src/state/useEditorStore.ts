import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { getPreset } from '../config/characters'
import { resolveClip } from '../config/clips'
import { DEFAULT_ENVIRONMENT_ID } from '../config/environments'
import { DEFAULT_TERRAIN_ID, OBJECT_PALETTE } from '../config/library'
import { SCENE_TEMPLATES } from '../config/templates'
import { CAMERA } from '../config/studio'
import { nowISO, uid } from '../lib/uid'
import type { CameraMode, CameraRecording } from '../types/camera'
import type { Action, AnimationPlan, AnimationStep, Character, ClipId } from '../types/film'
import type { CompileState, SceneGeneration } from '../types/generation'
import type { ObjectKind, PropInstance, SceneObject } from '../types/objects'
import type { PoseStatus } from '../types/pose'
import type { SceneFrames } from '../scene/SceneCapturer'
import { PROJECT_SCHEMA_VERSION, type Project, type Scene } from '../types/project'
import type { Vec3 } from '../types/scene'
import type { LibraryTab, Panel } from '../types/ui'

const PERSIST_KEY = 'cinephone-project'

function colorFor(kind: ObjectKind): string {
  return OBJECT_PALETTE.find((p) => p.kind === kind)?.color ?? '#cccccc'
}

const SPAWN_HEIGHT = 0.8

function makeObject(kind: ObjectKind, position: Vec3): SceneObject {
  return { id: uid('obj'), kind, position, rotation: [0, 0, 0], scale: 1, color: colorFor(kind) }
}

function makeProp(presetId: string, position: Vec3): PropInstance {
  return { id: uid('prop'), presetId, position, rotation: [0, 0, 0], scale: 1 }
}

function makeCharacter(name: string, position: Vec3, color: string, presetId?: string): Character {
  return { id: uid('char'), name, position, color, presetId }
}

function createScene(name: string, seeded = false): Scene {
  const objects: SceneObject[] = seeded
    ? [
        makeObject('cube', [-2.4, 0.7, -2]),
        makeObject('sphere', [2.2, 0.9, -3]),
      ]
    : []
  return {
    id: uid('scene'),
    name,
    terrainId: DEFAULT_TERRAIN_ID,
    environmentId: DEFAULT_ENVIRONMENT_ID,
    objects,
    props: [],
    // No characters by default — spawn them from the Library → Objects sheet.
    characters: [],
    actions: [],
    fov: CAMERA.fov,
    recording: null,
  }
}

function createProject(): Project {
  const scene = createScene('Scene 1', true)
  const ts = nowISO()
  return {
    schemaVersion: PROJECT_SCHEMA_VERSION,
    id: uid('proj'),
    name: 'Untitled Project',
    description: '',
    createdAt: ts,
    updatedAt: ts,
    scenes: [scene],
    activeSceneId: scene.id,
  }
}

/** Pick the character an action refers to: one named in the text, else the first. */
function resolveCharacterId(scene: Scene, description: string): string | null {
  const words = new Set(description.toLowerCase().split(/\s+/))
  const named = scene.characters.find((c) => words.has(c.name.toLowerCase()))
  return (named ?? scene.characters[0])?.id ?? null
}

/** Per-character animation controller — the step queue the runtime executes
 *  (transient — never persisted). `rev` is bumped to (re)start a plan. */
interface CharacterController {
  steps: AnimationStep[]
  rev: number
}

interface EditorState {
  // ===== Source of truth =====
  project: Project

  // ===== Transient runtime state =====
  panel: Panel
  libraryTab: LibraryTab
  preview: boolean
  selectedId: string | null
  /** When on, the selected entity shows a translate gizmo. */
  moveMode: boolean
  cameraMode: CameraMode
  /** The action currently being dictated (between create/end markers). */
  draftActionId: string | null
  /** Active animation controller per character id. */
  controllers: Record<string, CharacterController>
  /** 6DoF camera tracking (AR) is active. */
  arActive: boolean
  arStatus: PoseStatus
  /** "Generate Movie" phase. */
  genOpen: boolean
  generations: Record<string, SceneGeneration>
  compile: CompileState
  /** Registered by the in-canvas SceneCapturer; captures the active scene. */
  captureFn: (() => Promise<SceneFrames>) | null
  /** Cloud model catalog: presetId → S3 key (empty until loaded). */
  modelCatalog: Record<string, string>

  // ---- UI ----
  openPanel: (panel: Panel) => void
  closePanel: () => void
  setLibraryTab: (tab: LibraryTab) => void
  togglePreview: () => void

  // ---- Project / scenes ----
  renameProject: (name: string) => void
  setDescription: (description: string) => void
  addScene: () => void
  addSceneFromTemplate: (templateId: string) => void
  selectScene: (id: string) => void
  renameScene: (id: string, name: string) => void
  removeScene: (id: string) => void
  resetProject: () => void
  /** Replace the whole document (e.g. loaded from the cloud). */
  loadProjectDocument: (project: Project) => void

  // ---- Objects ----
  addObject: (kind: ObjectKind) => void
  removeObject: (id: string) => void
  selectObject: (id: string | null) => void
  clearObjects: () => void
  setMoveMode: (on: boolean) => void
  /** Move any entity (object/character/prop) to a new ground position. */
  moveEntity: (id: string, position: Vec3) => void
  /** Delete the selected entity, whatever kind it is. */
  removeSelected: () => void

  // ---- Characters ----
  addCharacter: (presetId: string) => void
  removeCharacter: (id: string) => void

  // ---- Props (GLB set pieces) ----
  addProp: (presetId: string) => void
  removeProp: (id: string) => void

  // ---- Terrain / environment ----
  setTerrain: (id: string) => void
  setEnvironment: (id: string) => void

  // ---- Camera ----
  startRecording: () => void
  stopRecording: () => void
  commitRecording: (recording: CameraRecording) => void
  playRecording: () => void
  stopPlayback: () => void
  clearRecording: () => void
  setFov: (fov: number) => void

  // ---- Film: actions (driven by voice commands) ----
  beginAction: () => void
  updateDraftDescription: (description: string) => void
  endAction: (description: string) => void
  endScene: () => void
  removeAction: (id: string) => void
  /** Attach a choreographed plan to an action (for preview replay). */
  setActionPlan: (actionId: string, plan: AnimationPlan) => void
  /** Drive characters with a choreographed plan (grouped by character). */
  setPlan: (plan: AnimationPlan) => void
  /** Convenience: play a single clip on one character (HUD replay / fallback). */
  performCharacter: (characterId: string, clipId: ClipId) => void

  // ---- AR (6DoF camera tracking) ----
  toggleAr: () => void
  setArStatus: (status: PoseStatus) => void

  // ---- Generate Movie phase ----
  openGeneration: () => void
  closeGeneration: () => void
  setSceneGen: (sceneId: string, patch: Partial<SceneGeneration>) => void
  resetGenerations: () => void
  setCompile: (patch: Partial<CompileState>) => void
  setCaptureFn: (fn: (() => Promise<SceneFrames>) | null) => void
  setModelCatalog: (catalog: Record<string, string>) => void
}

export const selectActiveScene = (s: EditorState): Scene =>
  s.project.scenes.find((sc) => sc.id === s.project.activeSceneId) ?? s.project.scenes[0]

export const selectDraftAction = (s: EditorState): Action | null => {
  if (!s.draftActionId) return null
  return selectActiveScene(s).actions.find((a) => a.id === s.draftActionId) ?? null
}

export const useEditorStore = create<EditorState>()(
  persist(
    (set, get) => {
      const patchScene = (updater: (scene: Scene) => Scene) =>
        set((state) => ({
          project: {
            ...state.project,
            updatedAt: nowISO(),
            scenes: state.project.scenes.map((sc) =>
              sc.id === state.project.activeSceneId ? updater(sc) : sc,
            ),
          },
        }))

      const patchAction = (id: string, updater: (a: Action) => Action) =>
        patchScene((sc) => ({ ...sc, actions: sc.actions.map((a) => (a.id === id ? updater(a) : a)) }))

      const active = () => selectActiveScene(get())

      /** Assign plan steps to per-character controllers, bumping each rev. */
      const applyPlan = (plan: AnimationPlan) => {
        const byChar: Record<string, AnimationStep[]> = {}
        for (const step of plan.steps) (byChar[step.characterId] ??= []).push(step)
        set((s) => {
          const controllers = { ...s.controllers }
          for (const [cid, steps] of Object.entries(byChar)) {
            controllers[cid] = { steps, rev: (controllers[cid]?.rev ?? 0) + 1 }
          }
          return { controllers }
        })
      }

      /** Single-clip convenience (keyword fallback / HUD replay). */
      const playClip = (characterId: string | null, clipId: ClipId | null) => {
        if (!characterId || !clipId) return
        applyPlan({ steps: [{ characterId, action: 'play', clip: clipId, durationSec: 5, repeat: 1 }] })
      }

      return {
        project: createProject(),

        panel: 'none',
        libraryTab: 'terrain',
        preview: false,
        selectedId: null,
        moveMode: false,
        cameraMode: 'live',
        draftActionId: null,
        controllers: {},
        arActive: false,
        arStatus: 'idle',
        genOpen: false,
        generations: {},
        compile: { status: 'idle', progress: 0 },
        captureFn: null,
        modelCatalog: {},

        // ---- UI ----
        openPanel: (panel) => set({ panel, preview: false }),
        closePanel: () => set({ panel: 'none' }),
        setLibraryTab: (libraryTab) => set({ libraryTab }),
        togglePreview: () => {
          const next = !get().preview
          if (next) {
            set({ preview: true, panel: 'none' })
            if (active().recording) get().playRecording()
          } else {
            set({ preview: false })
            if (get().cameraMode === 'playback') get().stopPlayback()
          }
        },

        // ---- Project / scenes ----
        renameProject: (name) => set((s) => ({ project: { ...s.project, name, updatedAt: nowISO() } })),
        setDescription: (description) =>
          set((s) => ({ project: { ...s.project, description, updatedAt: nowISO() } })),
        addScene: () =>
          set((s) => {
            const scene = createScene(`Scene ${s.project.scenes.length + 1}`)
            return {
              project: {
                ...s.project,
                updatedAt: nowISO(),
                scenes: [...s.project.scenes, scene],
                activeSceneId: scene.id,
              },
              selectedId: null,
              cameraMode: 'live',
              draftActionId: null,
            }
          }),
        addSceneFromTemplate: (templateId) => {
          const t = SCENE_TEMPLATES.find((x) => x.id === templateId)
          if (!t) return
          const scene = createScene(t.label)
          scene.environmentId = t.environmentId
          scene.terrainId = t.terrainId
          scene.characters = t.characters.map((c) =>
            makeCharacter(getPreset(c.presetId)?.label ?? c.presetId, c.position, '#7c83ff', c.presetId),
          )
          scene.props = t.props.map((p) => makeProp(p.presetId, p.position))
          scene.objects = t.objects.map((o) => makeObject(o.kind, o.position))
          set((s) => ({
            project: {
              ...s.project,
              updatedAt: nowISO(),
              scenes: [...s.project.scenes, scene],
              activeSceneId: scene.id,
            },
            selectedId: null,
            cameraMode: 'live',
            draftActionId: null,
            controllers: {},
            panel: 'none',
          }))
        },
        selectScene: (id) =>
          set((s) => ({
            project: { ...s.project, activeSceneId: id },
            selectedId: null,
            cameraMode: 'live',
            draftActionId: null,
          })),
        renameScene: (id, name) =>
          set((s) => ({
            project: {
              ...s.project,
              updatedAt: nowISO(),
              scenes: s.project.scenes.map((sc) => (sc.id === id ? { ...sc, name } : sc)),
            },
          })),
        removeScene: (id) =>
          set((s) => {
            if (s.project.scenes.length <= 1) return s
            const scenes = s.project.scenes.filter((sc) => sc.id !== id)
            const activeSceneId = s.project.activeSceneId === id ? scenes[0].id : s.project.activeSceneId
            return {
              project: { ...s.project, updatedAt: nowISO(), scenes, activeSceneId },
              selectedId: null,
              cameraMode: 'live',
              draftActionId: null,
            }
          }),
        resetProject: () =>
          set({ project: createProject(), selectedId: null, cameraMode: 'live', draftActionId: null, controllers: {} }),
        loadProjectDocument: (project) =>
          set({ project, selectedId: null, cameraMode: 'live', draftActionId: null, controllers: {}, genOpen: false }),

        // ---- Objects ----
        addObject: (kind) => {
          const spread = (active().objects.length % 5) - 2
          const obj = makeObject(kind, [spread * 1.4, SPAWN_HEIGHT, -2.5])
          patchScene((sc) => ({ ...sc, objects: [...sc.objects, obj] }))
          set({ selectedId: obj.id })
        },
        removeObject: (id) => {
          patchScene((sc) => ({ ...sc, objects: sc.objects.filter((o) => o.id !== id) }))
          if (get().selectedId === id) set({ selectedId: null })
        },
        selectObject: (selectedId) => set({ selectedId }),
        clearObjects: () => {
          patchScene((sc) => ({ ...sc, objects: [] }))
          set({ selectedId: null })
        },
        setMoveMode: (moveMode) => set({ moveMode }),
        moveEntity: (id, position) =>
          patchScene((sc) => ({
            ...sc,
            objects: sc.objects.map((o) => (o.id === id ? { ...o, position } : o)),
            characters: sc.characters.map((c) => (c.id === id ? { ...c, position } : c)),
            props: sc.props.map((p) => (p.id === id ? { ...p, position } : p)),
          })),
        removeSelected: () => {
          const id = get().selectedId
          if (!id) return
          patchScene((sc) => ({
            ...sc,
            objects: sc.objects.filter((o) => o.id !== id),
            characters: sc.characters.filter((c) => c.id !== id),
            props: sc.props.filter((p) => p.id !== id),
          }))
          set({ selectedId: null })
        },

        // ---- Characters ----
        addCharacter: (presetId) => {
          const preset = getPreset(presetId)
          if (!preset) return
          const count = active().characters.length
          const spread = (count % 5) - 2
          const character = makeCharacter(
            preset.label,
            [spread * 1.8, 0, -4.5],
            '#7c83ff',
            preset.id,
          )
          patchScene((sc) => ({ ...sc, characters: [...sc.characters, character] }))
        },
        removeCharacter: (id) =>
          patchScene((sc) => ({ ...sc, characters: sc.characters.filter((c) => c.id !== id) })),

        // ---- Props ----
        addProp: (presetId) => {
          const spread = (active().props.length % 5) - 2
          const prop = makeProp(presetId, [spread * 2.2, 0, -6])
          patchScene((sc) => ({ ...sc, props: [...sc.props, prop] }))
        },
        removeProp: (id) =>
          patchScene((sc) => ({ ...sc, props: sc.props.filter((p) => p.id !== id) })),

        // ---- Terrain / environment ----
        setTerrain: (terrainId) => patchScene((sc) => ({ ...sc, terrainId })),
        setEnvironment: (environmentId) => patchScene((sc) => ({ ...sc, environmentId })),

        // ---- Camera ----
        startRecording: () => {
          patchScene((sc) => ({ ...sc, recording: null }))
          set({ cameraMode: 'recording' })
        },
        stopRecording: () => set({ cameraMode: 'live' }),
        commitRecording: (recording) => patchScene((sc) => ({ ...sc, recording })),
        playRecording: () => {
          if (active().recording) set({ cameraMode: 'playback' })
        },
        stopPlayback: () => set({ cameraMode: 'live' }),
        clearRecording: () => {
          patchScene((sc) => ({ ...sc, recording: null }))
          set({ cameraMode: 'live' })
        },
        setFov: (fov) => patchScene((sc) => ({ ...sc, fov })),

        // ---- Film: actions ----
        beginAction: () => {
          const scene = active()
          const action: Action = {
            id: uid('act'),
            description: '',
            clipId: null,
            characterId: scene.characters[0]?.id ?? null,
            takes: [],
            createdAt: nowISO(),
          }
          patchScene((sc) => ({ ...sc, actions: [...sc.actions, action] }))
          set({ draftActionId: action.id })
        },
        updateDraftDescription: (description) => {
          const id = get().draftActionId
          if (!id) return
          const scene = active()
          const clipId = resolveClip(description)
          const characterId = resolveCharacterId(scene, description)
          const prev = scene.actions.find((a) => a.id === id)
          patchAction(id, (a) => ({ ...a, description, clipId: clipId ?? a.clipId, characterId }))
          // Live feedback: perform as soon as a clip is recognised (or changes).
          if (clipId && clipId !== prev?.clipId) playClip(characterId, clipId)
        },
        endAction: (description) => {
          const id = get().draftActionId
          if (!id) {
            set({ draftActionId: null })
            return
          }
          const scene = active()
          const clipId = resolveClip(description) ?? scene.actions.find((a) => a.id === id)?.clipId ?? null
          const characterId = resolveCharacterId(scene, description)
          patchAction(id, (a) => ({
            ...a,
            description,
            clipId,
            characterId,
            takes: clipId ? [...a.takes, { id: uid('take'), clipId, createdAt: nowISO() }] : a.takes,
          }))
          playClip(characterId, clipId)
          set({ draftActionId: null })
        },
        endScene: () => set({ draftActionId: null }),
        removeAction: (id) => {
          patchScene((sc) => ({ ...sc, actions: sc.actions.filter((a) => a.id !== id) }))
          if (get().draftActionId === id) set({ draftActionId: null })
        },
        setActionPlan: (actionId, plan) => patchAction(actionId, (a) => ({ ...a, plan })),
        setPlan: (plan) => applyPlan(plan),
        performCharacter: (characterId, clipId) => playClip(characterId, clipId),

        // ---- AR ----
        toggleAr: () => {
          const next = !get().arActive
          // Entering AR takes over the camera — close panels, exit preview/playback.
          if (next) {
            if (get().cameraMode === 'playback') get().stopPlayback()
            set({ arActive: true, arStatus: 'starting', panel: 'none', preview: false })
          } else {
            set({ arActive: false, arStatus: 'idle' })
          }
        },
        setArStatus: (arStatus) => set({ arStatus }),

        // ---- Generate Movie ----
        openGeneration: () => {
          if (get().cameraMode === 'playback') get().stopPlayback()
          set({ genOpen: true, arActive: false, panel: 'none', preview: false })
        },
        closeGeneration: () => set({ genOpen: false }),
        setSceneGen: (sceneId, patch) =>
          set((s) => {
            const existing = s.generations[sceneId]
            return {
              generations: {
                ...s.generations,
                [sceneId]: {
                  ...existing,
                  ...patch,
                  sceneId,
                  status: patch.status ?? existing?.status ?? 'idle',
                },
              },
            }
          }),
        resetGenerations: () => set({ generations: {}, compile: { status: 'idle', progress: 0 } }),
        setCompile: (patch) => set((s) => ({ compile: { ...s.compile, ...patch } })),
        setCaptureFn: (captureFn) => set({ captureFn }),
        setModelCatalog: (modelCatalog) => set({ modelCatalog }),
      }
    },
    {
      name: PERSIST_KEY,
      partialize: (state) => ({ project: state.project }),
      version: PROJECT_SCHEMA_VERSION,
      // Migrate older persisted projects up to the current schema.
      migrate: (persisted, version) => {
        const state = persisted as { project?: Project } | undefined
        if (state?.project && version < 2) {
          state.project.scenes = state.project.scenes.map((sc) => ({
            ...sc,
            characters: sc.characters ?? [],
            actions: sc.actions ?? [],
          }))
        }
        if (state?.project && version < 3) {
          state.project.scenes = state.project.scenes.map((sc) => ({
            ...sc,
            environmentId: sc.environmentId ?? DEFAULT_ENVIRONMENT_ID,
            props: sc.props ?? [],
          }))
        }
        if (state?.project) state.project.schemaVersion = PROJECT_SCHEMA_VERSION
        return state as { project: Project }
      },
    },
  ),
)
