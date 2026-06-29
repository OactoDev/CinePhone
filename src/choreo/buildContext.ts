import { getPreset } from '../config/characters'
import { CLIPS } from '../config/clips'
import { getProp } from '../config/props'
import type { ClipId } from '../types/film'
import type { Scene } from '../types/project'

/**
 * Compact scene description handed to the choreographer LLM. Includes every
 * entity's [x,z] position and an approximate radius so the model can move
 * characters to sensible spots, stop short for melee, and avoid collisions.
 */
export interface ChoreoEntity {
  id: string
  name: string
  kind: 'character' | 'object' | 'prop'
  position: [number, number]
  /** Approximate footprint radius (world units) for spacing/collision. */
  radius: number
}

export interface ChoreoContext {
  /** Performers that can be directed, with the clips each can perform. */
  characters: { id: string; name: string; position: [number, number]; clips: ClipId[] }[]
  /** Everything in the scene (characters + objects + props) as targets/obstacles. */
  entities: ChoreoEntity[]
}

const ALL_CLIPS = CLIPS.map((c) => c.id)

function clipsFor(presetId?: string): ClipId[] {
  const preset = getPreset(presetId)
  if (!preset) return ALL_CLIPS
  const keys = Object.keys(preset.clipAliases) as ClipId[]
  return keys.length ? keys : ['idle']
}

const round = (n: number) => Math.round(n * 10) / 10
const pos2 = (p: readonly number[]): [number, number] => [round(p[0]), round(p[2])]

export function buildContext(scene: Scene): ChoreoContext {
  const entities: ChoreoEntity[] = [
    ...scene.characters.map((c) => ({
      id: c.id,
      name: c.name,
      kind: 'character' as const,
      position: pos2(c.position),
      radius: 0.5,
    })),
    ...scene.objects.map((o) => ({
      id: o.id,
      name: o.kind,
      kind: 'object' as const,
      position: pos2(o.position),
      radius: round(0.7 * o.scale),
    })),
    ...scene.props.map((p) => ({
      id: p.id,
      name: getProp(p.presetId)?.label ?? p.presetId,
      kind: 'prop' as const,
      position: pos2(p.position),
      radius: round(0.7 * p.scale),
    })),
  ]

  return {
    characters: scene.characters.map((c) => ({
      id: c.id,
      name: c.name,
      position: pos2(c.position),
      clips: clipsFor(c.presetId),
    })),
    entities,
  }
}
