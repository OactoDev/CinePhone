import Anthropic from '@anthropic-ai/sdk'

/**
 * LLM choreographer: turn a spoken action + scene context into a structured
 * AnimationPlan the runtime executes on the rigs. Uses Claude with structured
 * outputs (json_schema) at low effort. Server-side only — the key never leaves
 * the dev proxy. The client falls back to keyword matching if this is absent.
 */

const CLIP_ENUM = ['idle', 'walk', 'run', 'jump', 'wave', 'dance', 'spin', 'attack', 'sit', 'die']

const PLAN_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['steps'],
  properties: {
    steps: {
      type: 'array',
      items: {
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
      },
    },
  },
}

const SYSTEM = `You are a motion director for a 3D scene. You receive a spoken ACTION and the SCENE:
- characters: performers you can direct (id, name, [x,z] position, and the clip names each can play)
- entities: EVERY object in the scene (characters + objects + props) with id, name, kind, [x,z]
  position, and an approximate footprint "radius" — use these for placement and collision.

Output an AnimationPlan: an ordered list of steps that make the ACTION happen, using ONLY each
character's available clips and the listed ids.

Step kinds:
- "face": turn a character to face a targetId.
- "move": walk/run a character toward a destination — either a targetId OR an explicit "to":[x,z].
  Set "distance" to stop short (≈ myRadius + targetRadius + 0.4; e.g. ~1.2–1.6 for melee range).
  Set clip to "walk" or "run".
- "play": play a clip (attack/wave/jump/dance/cast→use attack, etc.) for durationSec; "repeat" for one-shots.
- "wait": pause.

COLLISION & PLACEMENT RULES (important):
- Positions are [x,z] world units (x = left/right, z = depth; the camera looks down -z).
- Never move a character ONTO another entity. Keep at least (myRadius + otherRadius + 0.3) clearance.
- To approach a target, use "move" with that targetId and a "distance" so the character stops beside
  it, not inside it. To reposition without a target, use "to":[x,z] at an OPEN spot that doesn't overlap
  any entity's radius. Account for radii when choosing coordinates.
- Prefer routing to the near side of the target (don't path straight through other entities).

Rules: pick the acting character from the ACTION (match a name; else the first character). Keep plans
short (2–6 steps). Durations: move 1–3s, play 1–2s. If a needed clip isn't available, pick the closest.
Reference entities by their exact id.`

export async function choreograph(apiKey: string, raw: string): Promise<unknown> {
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set')
  const { action, context } = JSON.parse(raw) as { action: string; context: unknown }

  const client = new Anthropic({ apiKey })
  const res = await client.messages.create({
    // Haiku 4.5: fastest tier for low-latency choreography (no `effort` — Haiku
    // rejects it). Structured outputs are supported.
    model: 'claude-haiku-4-5',
    max_tokens: 1500,
    output_config: { format: { type: 'json_schema', schema: PLAN_SCHEMA } },
    system: SYSTEM,
    messages: [{ role: 'user', content: `ACTION: "${action}"\nSCENE: ${JSON.stringify(context)}` }],
  } as unknown as Anthropic.MessageCreateParamsNonStreaming)

  const text = res.content.find((b): b is Anthropic.TextBlock => b.type === 'text')?.text ?? '{"steps":[]}'
  return JSON.parse(text)
}
