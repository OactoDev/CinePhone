/**
 * Data contracts for the ground/terrain.
 */

export type TerrainKind = 'grid' | 'procedural'

/** A selectable terrain preset shown in the Terrain tab. */
export interface TerrainPreset {
  id: string
  label: string
  kind: TerrainKind
  /** Peak displacement height (procedural only). */
  amplitude: number
  /** Base noise frequency — larger = more, tighter features (procedural only). */
  frequency: number
  /** Number of noise octaves layered for detail (procedural only). */
  octaves: number
  /** Surface colour. */
  color: string
}
