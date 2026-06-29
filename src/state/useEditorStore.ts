import { create } from 'zustand'
import { DEFAULT_TERRAIN_ID, OBJECT_PALETTE } from '../config/library'
import type { CameraMode, CameraRecording } from '../types/camera'
import type { ObjectKind, SceneObject } from '../types/objects'
import type { Vec3 } from '../types/scene'
import type { LibraryTab, Panel } from '../types/ui'

let nextId = 0
const makeId = () => `obj_${nextId++}`

function colorFor(kind: ObjectKind): string {
  return OBJECT_PALETTE.find((p) => p.kind === kind)?.color ?? '#cccccc'
}

/** A spawned object's resting height so primitives sit on the ground. */
const SPAWN_HEIGHT = 0.8

/** Seed the sandbox with a few objects (mirrors the old SampleObjects). */
const SEED_OBJECTS: SceneObject[] = [
  { id: makeId(), kind: 'cube', position: [-1.6, 0.7, -2], rotation: [0, 0.3, 0], scale: 1, color: colorFor('cube') },
  { id: makeId(), kind: 'sphere', position: [1, 0.9, -3], rotation: [0, 0, 0], scale: 1, color: colorFor('sphere') },
  { id: makeId(), kind: 'torusKnot', position: [2.4, 0.6, -1], rotation: [0, 0, 0], scale: 1, color: colorFor('torusKnot') },
]

interface EditorState {
  // ---- UI navigation ----
  panel: Panel
  libraryTab: LibraryTab
  preview: boolean
  openPanel: (panel: Panel) => void
  closePanel: () => void
  setLibraryTab: (tab: LibraryTab) => void
  togglePreview: () => void

  // ---- Scene: objects ----
  objects: SceneObject[]
  selectedId: string | null
  addObject: (kind: ObjectKind) => void
  removeObject: (id: string) => void
  selectObject: (id: string | null) => void
  clearObjects: () => void

  // ---- Scene: terrain ----
  terrainId: string
  setTerrain: (id: string) => void

  // ---- Camera record / playback ----
  cameraMode: CameraMode
  recording: CameraRecording | null
  fov: number
  startRecording: () => void
  stopRecording: () => void
  commitRecording: (recording: CameraRecording) => void
  playRecording: () => void
  stopPlayback: () => void
  clearRecording: () => void
  setFov: (fov: number) => void
}

export const useEditorStore = create<EditorState>((set, get) => ({
  // ---- UI ----
  panel: 'none',
  libraryTab: 'terrain',
  preview: false,
  openPanel: (panel) => set({ panel, preview: false }),
  closePanel: () => set({ panel: 'none' }),
  setLibraryTab: (libraryTab) => set({ libraryTab }),
  togglePreview: () => {
    const next = !get().preview
    // Entering preview: close panels and (if we have one) play the recording.
    if (next) {
      set({ preview: true, panel: 'none' })
      if (get().recording) get().playRecording()
    } else {
      set({ preview: false })
      if (get().cameraMode === 'playback') get().stopPlayback()
    }
  },

  // ---- Objects ----
  objects: SEED_OBJECTS,
  selectedId: null,
  addObject: (kind) => {
    // Spawn slightly in front of the world origin with a little spread.
    const spread = (get().objects.length % 5) - 2
    const position: Vec3 = [spread * 1.4, SPAWN_HEIGHT, -2.5]
    const obj: SceneObject = { id: makeId(), kind, position, rotation: [0, 0, 0], scale: 1, color: colorFor(kind) }
    set((s) => ({ objects: [...s.objects, obj], selectedId: obj.id }))
  },
  removeObject: (id) =>
    set((s) => ({
      objects: s.objects.filter((o) => o.id !== id),
      selectedId: s.selectedId === id ? null : s.selectedId,
    })),
  selectObject: (selectedId) => set({ selectedId }),
  clearObjects: () => set({ objects: [], selectedId: null }),

  // ---- Terrain ----
  terrainId: DEFAULT_TERRAIN_ID,
  setTerrain: (terrainId) => set({ terrainId }),

  // ---- Camera ----
  cameraMode: 'live',
  recording: null,
  fov: 60,
  startRecording: () => set({ cameraMode: 'recording', recording: null }),
  // Stop just returns to 'live'; the recorder hook commits the captured buffer.
  stopRecording: () => set({ cameraMode: 'live' }),
  commitRecording: (recording) => set({ recording }),
  playRecording: () => {
    if (get().recording) set({ cameraMode: 'playback' })
  },
  stopPlayback: () => set({ cameraMode: 'live' }),
  clearRecording: () => set({ recording: null, cameraMode: 'live' }),
  setFov: (fov) => set({ fov }),
}))
