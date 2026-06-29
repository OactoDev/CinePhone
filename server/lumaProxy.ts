import type { Connect, Plugin } from 'vite'
import { loadEnv } from 'vite'

/**
 * Vite dev-server middleware that proxies the Luma AI (Dream Machine) API so the
 * secret LUMA_API_KEY never reaches the browser, and to sidestep CORS.
 *
 * Routes (same-origin, dev only):
 *   POST /api/luma/generate     → POST {base}/generations/video
 *   GET  /api/luma/status?id=   → GET  {base}/generations/{id}
 *   GET  /api/luma/asset?url=   → streams a *.cdn-luma.com asset (for ffmpeg)
 *
 * Production note: ship the same handlers as a real serverless/Node backend.
 */

const LUMA_BASE = 'https://api.lumalabs.ai/dream-machine/v1'
const CREATE_PATH = '/generations/video'

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

export function lumaProxy(): Plugin {
  return {
    name: 'cinephone-luma-proxy',
    configureServer(server) {
      const env = loadEnv(server.config.mode, process.cwd(), '')
      // Trim to guard against a stray newline/space in .env corrupting the header.
      const apiKey = (env.LUMA_API_KEY ?? '').trim()
      const authHeaders = {
        authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json',
        accept: 'application/json',
      }

      server.middlewares.use('/api/luma', async (req, res) => {
        const url = new URL(req.url ?? '', 'http://localhost')
        const route = url.pathname.replace(/\/$/, '')

        if (!apiKey) {
          sendJson(res, 500, { error: 'LUMA_API_KEY is not set in .env' })
          return
        }

        try {
          // --- create a generation ---
          if (route === '/generate' && req.method === 'POST') {
            const body = await readBody(req)
            const r = await fetch(`${LUMA_BASE}${CREATE_PATH}`, {
              method: 'POST',
              headers: authHeaders,
              body,
            })
            sendJson(res, r.status, await r.json())
            return
          }

          // --- poll a generation ---
          if (route === '/status' && req.method === 'GET') {
            const id = url.searchParams.get('id')
            if (!id) return sendJson(res, 400, { error: 'missing id' })
            const r = await fetch(`${LUMA_BASE}/generations/${id}`, { headers: authHeaders })
            sendJson(res, r.status, await r.json())
            return
          }

          // --- stream a Luma CDN asset (avoids browser CORS for ffmpeg) ---
          if (route === '/asset' && req.method === 'GET') {
            const target = url.searchParams.get('url')
            if (!target) return sendJson(res, 400, { error: 'missing url' })
            const host = new URL(target).hostname
            if (!host.endsWith('cdn-luma.com')) {
              return sendJson(res, 403, { error: 'host not allowed' })
            }
            const r = await fetch(target)
            res.statusCode = r.status
            res.setHeader('content-type', r.headers.get('content-type') ?? 'application/octet-stream')
            res.end(Buffer.from(await r.arrayBuffer()))
            return
          }

          sendJson(res, 404, { error: 'not found' })
        } catch (e) {
          sendJson(res, 502, { error: e instanceof Error ? e.message : 'proxy error' })
        }
      })
    },
  }
}
