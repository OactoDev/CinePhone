import { getClip } from '../config/clips'
import { TERRAIN_PRESETS } from '../config/library'
import type { Scene } from '../types/project'
import type { Project } from '../types/project'
import type { Vec3 } from '../types/scene'

/**
 * Pure: turn a scene (in the context of its project) into a cinematic Luma
 * prompt that references the EXACT scene contents — terrain, objects (with
 * colours + rough placement), characters and the actions they perform, the
 * recorded camera move, and the project's own context notes — so the render
 * reflects what was actually composed rather than a generic clip.
 */

function side(n: number) {
  return n < -0.6 ? 'left' : n > 0.6 ? 'right' : 'centre'
}
function depth(z: number) {
  return z < -4 ? 'far' : z > -1.5 ? 'near' : 'mid'
}
function place([x, , z]: Vec3) {
  return `${depth(z)} ${side(x)}`
}

/** Describe the camera move from the recording's start→end delta. */
function describeCamera(scene: Scene): string {
  const s = scene.recording?.samples
  if (!s || s.length < 2) return 'a slow, steady cinematic camera hold'
  const a = s[0].position
  const b = s[s.length - 1].position
  const dx = b[0] - a[0]
  const dz = b[2] - a[2]
  const dist = Math.hypot(dx, dz)
  if (dist < 0.5) return 'a gentle handheld camera with subtle parallax'
  const moves: string[] = []
  if (Math.abs(dz) > Math.abs(dx)) moves.push(dz < 0 ? 'pushing forward (dolly in)' : 'pulling back (dolly out)')
  else moves.push(dx > 0 ? 'panning right' : 'panning left')
  return `a fluid tracking camera ${moves[0]} over ${scene.recording!.duration.toFixed(0)}s`
}

export function buildScenePrompt(scene: Scene, project: Project): string {
  const terrain = TERRAIN_PRESETS.find((t) => t.id === scene.terrainId)?.label ?? 'open ground'

  const objects = scene.objects
    .map((o) => `a ${o.color} ${o.kind} (${place(o.position)})`)
    .join(', ')

  const performances = scene.actions
    .filter((a) => a.clipId)
    .map((a) => {
      const who = scene.characters.find((c) => c.id === a.characterId)?.name ?? 'a figure'
      const clip = getClip(a.clipId!).label.toLowerCase()
      return `${who} ${clip}s${a.description ? ` (${a.description})` : ''}`
    })
    .join('; ')

  const characters = scene.characters.map((c) => c.name).join(', ')

  const parts = [
    project.description ? `${project.description.trim()}.` : '',
    `${terrain} environment.`,
    objects ? `Featuring ${objects}.` : '',
    characters ? `Characters: ${characters}.` : '',
    performances ? `Action: ${performances}.` : '',
    `Camera: ${describeCamera(scene)}.`,
    'Cinematic, photorealistic, volumetric lighting, soft shadows, shallow depth of field, 35mm film look, high detail.',
  ]

  return parts.filter(Boolean).join(' ')
}
