/**
 * Shared choreography contract for the Claude endpoints (single-beat
 * `choreograph` + multi-beat `direct`). Keeping the step schema + the staging
 * rules in one place means both prompts stay in sync.
 */

export const CLIP_ENUM = ['idle', 'walk', 'run', 'jump', 'wave', 'dance', 'spin', 'attack', 'sit', 'die']

/** JSON-schema for a single AnimationStep. */
export const STEP_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['characterId', 'action', 'durationSec'],
  properties: {
    characterId: { type: 'string' },
    action: { type: 'string', enum: ['move', 'face', 'play', 'wait'] },
    clip: { type: 'string', enum: CLIP_ENUM },
    targetId: { type: 'string' },
    to: { type: 'array', items: { type: 'number' } },
    distance: { type: 'number' },
    durationSec: { type: 'number' },
    repeat: { type: 'integer' },
  },
} as const

/** JSON-schema for an AnimationPlan ({ steps: [...] }). */
export const PLAN_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['steps'],
  properties: {
    steps: { type: 'array', items: STEP_SCHEMA },
  },
} as const

/** The step kinds + collision/placement rules, shared by both system prompts. */
export const STAGING_RULES = `Step kinds:
- "face": turn a character to face a targetId.
- "move": walk/run a character toward a destination — either a targetId OR an explicit "to":[x,z].
  Set "distance" to stop short (≈ myRadius + targetRadius + 0.4; e.g. ~1.2–1.6 for melee range).
  Set clip to "walk" or "run".
- "play": play a clip (attack/wave/jump/dance/cast→use attack, etc.) for durationSec; "repeat" for one-shots.
- "wait": pause (use to hold a pose or stagger reactions between characters).

COLLISION & PLACEMENT RULES (important):
- Positions are [x,z] world units (x = left/right, z = depth; the camera looks down -z).
- Never move a character ONTO another entity. Keep at least (myRadius + otherRadius + 0.3) clearance.
- To approach a target, use "move" with that targetId and a "distance" so the character stops beside
  it, not inside it. To reposition without a target, use "to":[x,z] at an OPEN spot that doesn't overlap
  any entity's radius. Account for radii when choosing coordinates.
- Prefer routing to the near side of the target (don't path straight through other entities).

CINEMATIC STAGING:
- Stage for the camera (it looks down -z): keep the action readable, face performers toward each other
  or the camera, and give reactions (a recoil, a turn, a wait) so beats feel motivated, not robotic.
- Use the FULL space and the listed entities (cover behind a prop, circle a target) — vary distances
  and angles instead of everyone bunching at the origin.`
