import { FAL } from '../config/fal'

/**
 * Thin client for our same-origin fal.ai proxy (`/api/fal/*`). The proxy injects
 * the secret key and forwards to fal's queue API. Flow: submit a job, poll its
 * status url, then fetch its response url for the video.
 */

export interface FalSubmission {
  request_id: string
  status_url: string
  response_url: string
}

type FalStatus = 'IN_QUEUE' | 'IN_PROGRESS' | 'COMPLETED'

/** Public generation state, mapped to the storyboard's vocabulary. */
export type GenState = 'queued' | 'dreaming' | 'completed' | 'failed'

/** Upload a captured keyframe (data URL) to fal storage; returns a fal-hosted,
 *  HEAD-able URL the generator can fetch (S3 presigned URLs reject fal's HEAD). */
export async function uploadImage(dataUrl: string): Promise<string> {
  const res = await fetch(`${FAL.proxyBase}/upload`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ dataUrl }),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json?.error ?? json?.detail ?? `fal upload failed (${res.status})`)
  return json.url as string
}

/** Submit an image→video generation. `imageUrl` is a fal-hosted keyframe. */
export async function createGeneration(opts: { prompt: string; imageUrl: string }): Promise<FalSubmission> {
  const res = await fetch(`${FAL.proxyBase}/generate`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      model: FAL.model,
      // Minimal, universally-accepted inputs (works across i2v models).
      input: { prompt: opts.prompt, image_url: opts.imageUrl },
    }),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json?.detail ?? json?.error ?? `fal create failed (${res.status})`)
  if (!json?.status_url || !json?.response_url) throw new Error('fal: missing queue urls')
  return json as FalSubmission
}

async function poll(falUrl: string): Promise<any> {
  const res = await fetch(`${FAL.proxyBase}/poll?url=${encodeURIComponent(falUrl)}`)
  const json = await res.json()
  if (!res.ok) throw new Error(json?.detail ?? json?.error ?? `fal poll failed (${res.status})`)
  return json
}

/** Find the output video URL in a fal result payload (model-shape tolerant). */
function extractVideoUrl(result: any): string | undefined {
  return result?.video?.url ?? result?.videos?.[0]?.url ?? result?.output?.video?.url
}

/**
 * Poll the submission until completed/failed or timeout. Returns the video URL.
 * Aborts early (throws "cancelled") whenever `shouldCancel` returns true.
 */
export async function pollUntilDone(
  sub: FalSubmission,
  onState?: (state: GenState) => void,
  shouldCancel?: () => boolean,
): Promise<{ videoUrl?: string }> {
  const deadline = Date.now() + FAL.pollTimeoutMs
  let last: GenState | undefined
  await sleep(FAL.pollIntervalMs)
  while (Date.now() < deadline) {
    if (shouldCancel?.()) throw new Error('cancelled')
    const status = (await poll(sub.status_url)) as { status: FalStatus }
    const mapped: GenState =
      status.status === 'COMPLETED' ? 'completed' : status.status === 'IN_PROGRESS' ? 'dreaming' : 'queued'
    if (mapped !== last) {
      last = mapped
      onState?.(mapped)
    }
    if (status.status === 'COMPLETED') {
      const result = await poll(sub.response_url)
      return { videoUrl: extractVideoUrl(result) }
    }
    await sleep(FAL.pollIntervalMs)
  }
  throw new Error('fal generation timed out')
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

/** Route a fal media URL through our proxy (avoids CDN CORS for ffmpeg). */
export function proxiedAssetUrl(url: string): string {
  return `${FAL.proxyBase}/asset?url=${encodeURIComponent(url)}`
}
