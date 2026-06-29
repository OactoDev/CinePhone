/**
 * Project document — the single source of truth for everything in a CinePhone
 * project. This is the shape that gets persisted (localStorage today, a backend
 * later) and that every part of the app reads/writes through the store.
 *
 * A project owns many scenes; each scene owns its own terrain, objects, camera
 * recording and lens. Bump `schemaVersion` when the shape changes so older
 * saved documents can be migrated.
 */
import type { CameraRecording } from './camera'
import type { Action, Character } from './film'
import type { PropInstance, SceneObject } from './objects'

export const PROJECT_SCHEMA_VERSION = 4

/** One composed scene within a project. */
export interface Scene {
  id: string
  name: string
  /** Free-form scene synopsis — the AI director input + Luma prompt enrichment. */
  synopsis?: string
  /** Terrain preset id (see `config/library.ts`). */
  terrainId: string
  /** Environment/lighting preset id (see `config/environments.ts`). */
  environmentId: string
  /** User-placed primitive objects in this scene. */
  objects: SceneObject[]
  /** Placed GLB set-piece props (see `config/props.ts`). */
  props: PropInstance[]
  /** Performers in this scene. */
  characters: Character[]
  /** Directed beats (the script) for this scene. */
  actions: Action[]
  /** Camera field of view (degrees). */
  fov: number
  /** Recorded camera move for this scene, if any. */
  recording: CameraRecording | null
}

/** The top-level project document. */
export interface Project {
  schemaVersion: number
  id: string
  name: string
  /** Free-form context / notes about the project. */
  description: string
  /** ISO timestamps. */
  createdAt: string
  updatedAt: string
  scenes: Scene[]
  activeSceneId: string
}
