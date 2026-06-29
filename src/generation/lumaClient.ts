import { LUMA } from '../config/luma'

/**
 * Thin client for our same-origin Luma proxy (`/api/luma/*`). The proxy injects
 * the secret key and forwards to Luma's Dream Machine API.
 */

export interface Keyframe {
  type: 'image'
  url: string
}

export interface CreateGenerationBody {
  prompt: string
  model?: string
  aspect_ratio?: string
  duration?: string
  resolution?: string
  loop?: boolean
  keyframes?: { frame0?: Keyframe; frame1?: Keyframe }
}

export interface Generation {
  id: string
  state: 'queued' | 'dreaming' | 'completed' | 'failed'
  failure_reason?: string | null
  assets?: { video?: string | null; thumbnail?: string | null }
}

export async function createGeneration(body: CreateGenerationBody): Promise<Generation> {
  const res = await fetch(`${LUMA.proxyBase}/generate`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      model: LUMA.model,
      aspect_ratio: LUMA.aspectRatio,
      duration: LUMA.duration,
      resolution: LUMA.resolution,
      ...body,
    }),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json?.error ?? `Luma create failed (${res.status})`)
  return json as Generation
}

export async function getGeneration(id: string): Promise<Generation> {
  const res = await fetch(`${LUMA.proxyBase}/status?id=${encodeURIComponent(id)}`)
  const json = await res.json()
  if (!res.ok) throw new Error(json?.error ?? `Luma status failed (${res.status})`)
  return json as Generation
}

/** Poll until completed/failed or timeout; calls `onState` on each change. */
export async function pollUntilDone(
  id: string,
  onState?: (state: Generation['state']) => void,
): Promise<Generation> {
  const deadline = Date.now() + LUMA.pollTimeoutMs
  let last: string | undefined
  // Initial grace period — video jobs take a while to start.
  await sleep(LUMA.pollIntervalMs)
  while (Date.now() < deadline) {
    const gen = await getGeneration(id)
    if (gen.state !== last) {
      last = gen.state
      onState?.(gen.state)
    }
    if (gen.state === 'completed') return gen
    if (gen.state === 'failed') throw new Error(gen.failure_reason ?? 'Luma generation failed')
    await sleep(LUMA.pollIntervalMs)
  }
  throw new Error('Luma generation timed out')
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

/** Build a Luma asset URL routed through our proxy (avoids CDN CORS for ffmpeg). */
export function proxiedAssetUrl(url: string): string {
  return `${LUMA.proxyBase}/asset?url=${encodeURIComponent(url)}`
}
