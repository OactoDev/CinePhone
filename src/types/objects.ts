/**
 * Data contracts for spawnable scene objects.
 */
import type { Vec3 } from './scene'

export type ObjectKind = 'cube' | 'sphere' | 'cylinder' | 'cone' | 'torus' | 'torusKnot'

/** A single user-placed object in the scene. */
export interface SceneObject {
  id: string
  kind: ObjectKind
  position: Vec3
  rotation: Vec3
  scale: number
  color: string
}

/** One entry in the object palette shown in the Objects tab. */
export interface ObjectPaletteItem {
  kind: ObjectKind
  label: string
  color: string
}
