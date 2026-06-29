import { createNoise2D } from 'simplex-noise'
import { PlaneGeometry } from 'three'
import { TERRAIN_PRESETS, TERRAIN_SEGMENTS, TERRAIN_SIZE } from '../../config/library'
import type { TerrainPreset } from '../../types/terrain'

/**
 * Terrain noise as a pure height field. `makeHeightSampler` returns `(x,z) → y`,
 * used both to build the terrain mesh AND to rest characters/props on the ground
 * (so they share the exact same surface).
 */
function mulberry32(a: number) {
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function makeHeightSampler(preset: TerrainPreset): (x: number, z: number) => number {
  if (preset.kind !== 'procedural' || preset.amplitude === 0) return () => 0
  let seed = 0
  for (let i = 0; i < preset.id.length; i++) seed += preset.id.charCodeAt(i)
  const noise2D = createNoise2D(mulberry32(seed))
  return (x: number, z: number) => {
    let height = 0
    let amplitude = 1
    let frequency = preset.frequency
    let norm = 0
    for (let o = 0; o < preset.octaves; o++) {
      height += noise2D(x * frequency, z * frequency) * amplitude
      norm += amplitude
      amplitude *= 0.5
      frequency *= 2
    }
    return (norm > 0 ? height / norm : height) * preset.amplitude
  }
}

/** Cached sampler per terrain id (so gravity lookups don't rebuild noise). */
const samplerCache = new Map<string, (x: number, z: number) => number>()
export function terrainHeightAt(terrainId: string, x: number, z: number): number {
  let s = samplerCache.get(terrainId)
  if (!s) {
    const preset = TERRAIN_PRESETS.find((p) => p.id === terrainId) ?? TERRAIN_PRESETS[0]
    s = makeHeightSampler(preset)
    samplerCache.set(terrainId, s)
  }
  return s(x, z)
}

/**
 * Pure terrain factory: a subdivided plane displaced by the height sampler.
 * Built in the XY plane then rotated flat (XZ) via `<mesh rotation-x={-PI/2}>`.
 */
export function generateTerrainGeometry(preset: TerrainPreset): PlaneGeometry {
  const geometry = new PlaneGeometry(TERRAIN_SIZE, TERRAIN_SIZE, TERRAIN_SEGMENTS, TERRAIN_SEGMENTS)
  const sample = makeHeightSampler(preset)
  const pos = geometry.attributes.position
  for (let i = 0; i < pos.count; i++) {
    pos.setZ(i, sample(pos.getX(i), pos.getY(i)))
  }
  pos.needsUpdate = true
  geometry.computeVertexNormals()
  return geometry
}
