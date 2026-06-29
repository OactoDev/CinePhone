import Anthropic from '@anthropic-ai/sdk'
import { PLAN_SCHEMA, STAGING_RULES } from './planSchema.ts'

/**
 * LLM choreographer: turn a spoken action + scene context into a structured
 * AnimationPlan the runtime executes on the rigs. Uses Claude Haiku (fast) with
 * structured outputs (json_schema). Server-side only — the key never leaves the
 * dev proxy. The client falls back to keyword matching if this is absent.
 */

const SYSTEM = `You are a motion director for a 3D scene. You receive a spoken ACTION and the SCENE:
- characters: performers you can direct (id, name, [x,z] position, and the clip names each can play)
- entities: EVERY object in the scene (characters + objects + props) with id, name, kind, [x,z]
  position, and an approximate footprint "radius" — use these for placement and collision.

Output an AnimationPlan: an ordered list of steps that make the ACTION happen, using ONLY each
character's available clips and the listed ids.

${STAGING_RULES}

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
