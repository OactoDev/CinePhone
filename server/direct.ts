import Anthropic from '@anthropic-ai/sdk'
import { STAGING_RULES, STEP_SCHEMA } from './planSchema.ts'

/**
 * AI director: turn a SCENE SYNOPSIS + the scene context into an ordered list of
 * cinematic BEATS, each with a title and a choreographed plan (steps). This is
 * the deliberate, user-triggered "Direct scene with AI" action, so it uses a
 * capable model (Opus 4.8 + adaptive thinking) for coherent multi-beat staging.
 * Server-side only — the key never leaves the dev proxy.
 */

const BEATS_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['beats'],
  properties: {
    beats: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['title', 'steps'],
        properties: {
          title: { type: 'string' },
          steps: { type: 'array', items: STEP_SCHEMA },
        },
      },
    },
  },
} as const

const SYSTEM = `You are a film director staging a 3D scene. You receive a SYNOPSIS (what should happen)
and the SCENE:
- characters: performers you can direct (id, name, [x,z] position, and the clip names each can play)
- entities: EVERY object in the scene (characters + objects + props) with id, name, kind, [x,z]
  position, and an approximate footprint "radius" — use these for placement and collision.

Break the SYNOPSIS into an ordered sequence of 3–7 BEATS that tell the story clearly. Each beat has:
- "title": a short shot name (e.g. "Approach", "The Clash", "Victory").
- "steps": an AnimationPlan for that beat — ordered steps using ONLY each character's available clips
  and the listed ids.

${STAGING_RULES}

Make beats flow: positions carry over between beats (a character ends where its last move left it), so
sequence movement logically. Give every named/important character something to do across the scene.
Keep each beat 2–5 steps. Reference entities by their exact id.`

export async function direct(apiKey: string, raw: string): Promise<unknown> {
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set')
  const { synopsis, context } = JSON.parse(raw) as { synopsis: string; context: unknown }

  const client = new Anthropic({ apiKey })
  const res = await client.messages.create({
    model: 'claude-opus-4-8',
    max_tokens: 6000,
    thinking: { type: 'adaptive' },
    output_config: { format: { type: 'json_schema', schema: BEATS_SCHEMA } },
    system: SYSTEM,
    messages: [{ role: 'user', content: `SYNOPSIS: "${synopsis}"\nSCENE: ${JSON.stringify(context)}` }],
  } as unknown as Anthropic.MessageCreateParamsNonStreaming)

  const text = res.content.find((b): b is Anthropic.TextBlock => b.type === 'text')?.text ?? '{"beats":[]}'
  return JSON.parse(text)
}
