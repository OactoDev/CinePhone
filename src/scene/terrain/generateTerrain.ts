import { createNoise2D } from 'simplex-noise'
import { PlaneGeometry } from 'three'
import { TERRAIN_SEGMENTS, TERRAIN_SIZE } from '../../config/library'
import type { TerrainPreset } from '../../types/terrain'

/**
 * Pure terrain factory: a subdivided plane displaced by fractal simplex noise.
 * React/DOM-free so it can be memoised by callers and unit-tested in isolation.
 *
 * The plane is built in the XY plane then rotated to lie flat (XZ), matching
 * how `<mesh rotation-x={-PI/2}>` orients it. Height is summed over `octaves`
 * of noise (fractal Brownian motion) for natural-looking detail.
 */
export function generateTerrainGeometry(preset: TerrainPreset): PlaneGeometry {
  const geometry = new PlaneGeometry(TERRAIN_SIZE, TERRAIN_SIZE, TERRAIN_SEGMENTS, TERRAIN_SEGMENTS)

  // Deterministic-ish seed per preset so each look is stable across reloads.
  let seed = 0
  for (let i = 0; i < preset.id.length; i++) seed += preset.id.charCodeAt(i)
  const noise2D = createNoise2D(mulberry32(seed))

  const pos = geometry.attributes.position
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    const y = pos.getY(i) // becomes Z after the flat rotation

    let height = 0
    let amplitude = 1
    let frequency = preset.frequency
    let norm = 0
    for (let o = 0; o < preset.octaves; o++) {
      height += noise2D(x * frequency, y * frequency) * amplitude
      norm += amplitude
      amplitude *= 0.5
      frequency *= 2
    }
    if (norm > 0) height /= norm

    pos.setZ(i, height * preset.amplitude)
  }

  pos.needsUpdate = true
  geometry.computeVertexNormals()
  return geometry
}

/** Small seeded PRNG so terrain is stable per preset. */
function mulberry32(a: number) {
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
