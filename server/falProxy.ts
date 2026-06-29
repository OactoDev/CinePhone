import type { Connect, Plugin } from 'vite'
import { loadEnv } from 'vite'

/**
 * Vite dev-server middleware that proxies the fal.ai queue API so the secret
 * FAL_API_KEY never reaches the browser, and to sidestep CORS.
 *
 * fal's queue flow: submit a job → poll its status_url → fetch its response_url.
 * We pass those fal URLs back to the client and proxy the follow-up GETs by URL
 * (rather than reconstructing them) since model ids contain slashes.
 *
 * Routes (same-origin, dev only):
 *   POST /api/fal/generate  {model, input}  → POST https://queue.fal.run/{model}
 *   GET  /api/fal/poll?url=  (status or response url) → GET that fal queue url
 *   GET  /api/fal/asset?url= → streams a *.fal.media asset (for ffmpeg)
 *
 * Production note: ship the same handlers as a real serverless/Node backend.
 */

const QUEUE_BASE = 'https://queue.fal.run'

function readBody(req: Connect.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = ''
    req.on('data', (c) => (data += c))
    req.on('end', () => resolve(data))
    req.on('error', reject)
  })
}
function sendJson(res: import('node:http').ServerResponse, status: number, body: unknown) {
  res.statusCode = status
  res.setHeader('content-type', 'application/json')
  res.end(JSON.stringify(body))
}

/** Only proxy GETs to fal's own queue/result hosts. */
function isFalApiHost(u: URL): boolean {
  return u.hostname === 'queue.fal.run' || u.hostname.endsWith('.fal.run') || u.hostname === 'fal.run'
}
/** fal serves rendered media from fal.media / *.fal.media. */
function isFalMediaHost(u: URL): boolean {
  return u.hostname === 'fal.media' || u.hostname.endsWith('.fal.media')
}

export function falProxy(): Plugin {
  return {
    name: 'cinephone-fal-proxy',
    configureServer(server) {
      const env = loadEnv(server.config.mode, process.cwd(), '')
      const apiKey = (env.FAL_API_KEY ?? '').trim()
      const auth = { authorization: `Key ${apiKey}`, 'content-type': 'application/json', accept: 'application/json' }

      server.middlewares.use('/api/fal', async (req, res) => {
        const url = new URL(req.url ?? '', 'http://localhost')
        const route = url.pathname.replace(/\/$/, '')

        if (!apiKey) {
          sendJson(res, 500, { error: 'FAL_API_KEY is not set in .env' })
          return
        }

        try {
          // --- upload a keyframe to fal storage (HEAD-able, fal-readable) ---
          if (route === '/upload' && req.method === 'POST') {
            const { dataUrl } = JSON.parse(await readBody(req)) as { dataUrl: string }
            const [head, b64] = String(dataUrl).split(',')
            const contentType = /:(.*?);/.exec(head)?.[1] ?? 'image/png'
            const bytes = Buffer.from(b64, 'base64')
            const init = await fetch(
              'https://rest.alpha.fal.ai/storage/upload/initiate?storage_type=fal-cdn-v3',
              { method: 'POST', headers: auth, body: JSON.stringify({ content_type: contentType, file_name: 'keyframe.png' }) },
            )
            if (!init.ok) return sendJson(res, init.status, await init.json())
            const { upload_url, file_url } = (await init.json()) as { upload_url: string; file_url: string }
            const put = await fetch(upload_url, { method: 'PUT', headers: { 'content-type': contentType }, body: bytes })
            if (!put.ok) return sendJson(res, 502, { error: `fal storage upload failed (${put.status})` })
            return sendJson(res, 200, { url: file_url })
          }

          // --- submit a generation to the queue ---
          if (route === '/generate' && req.method === 'POST') {
            const { model, input } = JSON.parse(await readBody(req)) as { model: string; input: unknown }
            const r = await fetch(`${QUEUE_BASE}/${model}`, {
              method: 'POST',
              headers: auth,
              body: JSON.stringify(input),
            })
            return sendJson(res, r.status, await r.json())
          }

          // --- poll a fal queue status/response url ---
          if (route === '/poll' && req.method === 'GET') {
            const target = url.searchParams.get('url')
            if (!target) return sendJson(res, 400, { error: 'missing url' })
            if (!isFalApiHost(new URL(target))) return sendJson(res, 403, { error: 'host not allowed' })
            const r = await fetch(target, { headers: auth })
            return sendJson(res, r.status, await r.json())
          }

          // --- stream a fal media asset (avoids browser CORS for ffmpeg) ---
          if (route === '/asset' && req.method === 'GET') {
            const target = url.searchParams.get('url')
            if (!target) return sendJson(res, 400, { error: 'missing url' })
            if (!isFalMediaHost(new URL(target))) return sendJson(res, 403, { error: 'host not allowed' })
            const r = await fetch(target)
            res.statusCode = r.status
            res.setHeader('content-type', r.headers.get('content-type') ?? 'application/octet-stream')
            return res.end(Buffer.from(await r.arrayBuffer()))
          }

          sendJson(res, 404, { error: 'not found' })
        } catch (e) {
          sendJson(res, 502, { error: e instanceof Error ? e.message : 'proxy error' })
        }
      })
    },
  }
}
