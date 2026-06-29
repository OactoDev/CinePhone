import type { Connect, Plugin } from 'vite'
import { loadEnv } from 'vite'
import { isAuroraConfigured, isS3Configured, readAwsEnv } from './awsClients.ts'
import { choreograph } from './choreograph.ts'
import {
  listGenerations,
  listModels,
  listProjects,
  loadProject,
  recordGeneration,
  saveProject,
  syncModels,
} from './db.ts'
import { getModelObject, handleUpload } from './storage.ts'

/**
 * Vite dev middleware exposing AWS-backed APIs (dev only — ship the same
 * handlers as a real backend for production):
 *   GET  /api/health                 → which providers are configured
 *   POST /api/storage/upload         → S3 upload, returns a fetchable URL
 *   PUT  /api/db/project             → upsert Project document (Aurora)
 *   GET  /api/db/project?id=         → load a Project document
 *   GET  /api/db/projects            → list saved projects
 *   POST /api/db/generation          → record a generation
 *   GET  /api/db/generations?projectId= → list generations
 */
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

export function awsApi(): Plugin {
  return {
    name: 'cinephone-aws-api',
    configureServer(server) {
      const raw = loadEnv(server.config.mode, process.cwd(), '')
      const env = readAwsEnv(raw)

      server.middlewares.use('/api', async (req, res, next) => {
        const url = new URL(req.url ?? '', 'http://localhost')
        const path = url.pathname.replace(/\/$/, '')
        // Luma routes belong to the luma proxy middleware.
        if (path.startsWith('/luma')) return next()
        try {
          if (path === '/health' && req.method === 'GET') {
            return sendJson(res, 200, {
              storage: isS3Configured(env),
              aurora: isAuroraConfigured(env),
              luma: Boolean(raw.LUMA_API_KEY),
              llm: Boolean(raw.ANTHROPIC_API_KEY),
            })
          }

          if (path === '/storage/upload' && req.method === 'POST') {
            return sendJson(res, 200, await handleUpload(env, await readBody(req)))
          }

          // Stream a model GLB from S3 (client loaders fetch via this proxy).
          if (path === '/storage/model' && req.method === 'GET') {
            const key = url.searchParams.get('key')
            if (!key) return sendJson(res, 400, { error: 'missing key' })
            const { body, contentType } = await getModelObject(env, key)
            res.statusCode = 200
            res.setHeader('content-type', contentType)
            res.setHeader('cache-control', 'public, max-age=86400')
            return res.end(body)
          }

          if (path === '/db/sync-models' && req.method === 'POST') {
            return sendJson(res, 200, await syncModels(env, await readBody(req)))
          }
          if (path === '/db/models' && req.method === 'GET') {
            return sendJson(res, 200, await listModels(env))
          }

          if (path === '/choreograph' && req.method === 'POST') {
            return sendJson(res, 200, await choreograph(raw.ANTHROPIC_API_KEY ?? '', await readBody(req)))
          }

          if (path === '/db/project' && req.method === 'PUT') {
            return sendJson(res, 200, await saveProject(env, await readBody(req)))
          }
          if (path === '/db/project' && req.method === 'GET') {
            const id = url.searchParams.get('id')
            if (!id) return sendJson(res, 400, { error: 'missing id' })
            return sendJson(res, 200, await loadProject(env, id))
          }
          if (path === '/db/projects' && req.method === 'GET') {
            return sendJson(res, 200, await listProjects(env))
          }
          if (path === '/db/generation' && req.method === 'POST') {
            return sendJson(res, 200, await recordGeneration(env, await readBody(req)))
          }
          if (path === '/db/generations' && req.method === 'GET') {
            const pid = url.searchParams.get('projectId')
            if (!pid) return sendJson(res, 400, { error: 'missing projectId' })
            return sendJson(res, 200, await listGenerations(env, pid))
          }

          // Not ours (e.g. /api/luma/*) — let other middleware handle it.
          return sendJson(res, 404, { error: 'not found' })
        } catch (e) {
          sendJson(res, 502, { error: e instanceof Error ? e.message : 'api error' })
        }
      })
    },
  }
}
