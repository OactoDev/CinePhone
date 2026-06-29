import type { ObjectPaletteItem } from '../types/objects'
import type { TerrainPreset } from '../types/terrain'

/**
 * Content catalogues for the Library sheet. Add new objects or terrain looks
 * here — the UI and scene read straight from these lists.
 */

export const OBJECT_PALETTE: ObjectPaletteItem[] = [
  { kind: 'cube', label: 'Cube', color: '#e8553b' },
  { kind: 'sphere', label: 'Sphere', color: '#2f6fed' },
  { kind: 'cylinder', label: 'Cylinder', color: '#3bb273' },
  { kind: 'cone', label: 'Cone', color: '#f4c95d' },
  { kind: 'torus', label: 'Torus', color: '#9b5de5' },
  { kind: 'torusKnot', label: 'Knot', color: '#ef798a' },
]

export const TERRAIN_PRESETS: TerrainPreset[] = [
  { id: 'grid', label: 'Flat Grid', kind: 'grid', amplitude: 0, frequency: 0, octaves: 0, color: '#c4c7cf' },
  { id: 'hills', label: 'Rolling Hills', kind: 'procedural', amplitude: 2.2, frequency: 0.04, octaves: 3, color: '#cdd2d8' },
  { id: 'mountains', label: 'Mountains', kind: 'procedural', amplitude: 7, frequency: 0.05, octaves: 5, color: '#b9bec7' },
  { id: 'dunes', label: 'Dunes', kind: 'procedural', amplitude: 1.4, frequency: 0.02, octaves: 2, color: '#dcd2be' },
]

/** The terrain selected on first load. */
export const DEFAULT_TERRAIN_ID = 'grid'

/** Shared geometry size (world units) for procedural terrain tiles. */
export const TERRAIN_SIZE = 200
export const TERRAIN_SEGMENTS = 200
