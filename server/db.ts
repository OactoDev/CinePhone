import { ExecuteStatementCommand, type SqlParameter } from '@aws-sdk/client-rds-data'
import { PutObjectCommand } from '@aws-sdk/client-s3'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { isAuroraConfigured, makeS3, makeRds, type AwsEnv } from './awsClients.ts'

/**
 * Aurora (PostgreSQL) persistence via the RDS Data API. Stores the full Project
 * document (the app's source of truth) and a history of generations. Schema is
 * created lazily on first use. All access is server-side.
 */

let schemaReady = false

function str(name: string, value: string): SqlParameter {
  return { name, value: { stringValue: value } }
}
function json(name: string, value: string): SqlParameter {
  return { name, value: { stringValue: value }, typeHint: 'JSON' }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function exec(env: AwsEnv, sql: string, parameters: SqlParameter[] = []) {
  const rds = makeRds(env)
  const cmd = new ExecuteStatementCommand({
    resourceArn: env.auroraResourceArn,
    secretArn: env.auroraSecretArn,
    database: env.auroraDatabase,
    sql,
    parameters,
    formatRecordsAs: 'JSON',
  })
  // Aurora Serverless auto-pauses when idle; the first call wakes it and throws
  // a resuming error — retry a few times while it spins up.
  let lastErr: unknown
  for (let i = 0; i < 8; i++) {
    try {
      return await rds.send(cmd)
    } catch (e) {
      const msg = e instanceof Error ? e.message : ''
      if (/resum|auto-paused|DatabaseResuming/i.test(msg)) {
        lastErr = e
        await sleep(2500)
        continue
      }
      throw e
    }
  }
  throw lastErr
}

function rows<T>(formattedRecords: string | undefined): T[] {
  return formattedRecords ? (JSON.parse(formattedRecords) as T[]) : []
}

async function ensureSchema(env: AwsEnv) {
  if (schemaReady) return
  await exec(
    env,
    `CREATE TABLE IF NOT EXISTS cinephone_projects (
       id text PRIMARY KEY,
       name text,
       document jsonb NOT NULL,
       updated_at timestamptz NOT NULL DEFAULT now()
     )`,
  )
  await exec(
    env,
    `CREATE TABLE IF NOT EXISTS cinephone_generations (
       id text PRIMARY KEY,
       project_id text NOT NULL,
       scene_id text,
       prompt text,
       luma_id text,
       video_url text,
       status text,
       created_at timestamptz NOT NULL DEFAULT now()
     )`,
  )
  await exec(
    env,
    `CREATE TABLE IF NOT EXISTS cinephone_models (
       id text PRIMARY KEY,
       kind text NOT NULL,
       label text,
       s3_key text NOT NULL,
       scale double precision,
       clip_aliases jsonb,
       updated_at timestamptz NOT NULL DEFAULT now()
     )`,
  )
  schemaReady = true
}

function guard(env: AwsEnv) {
  if (!isAuroraConfigured(env)) throw new Error('Aurora is not configured (set AURORA_* env vars)')
}

/** Upsert the whole Project document. */
export async function saveProject(env: AwsEnv, body: string): Promise<{ ok: true }> {
  guard(env)
  await ensureSchema(env)
  const project = JSON.parse(body) as { id: string; name: string }
  await exec(
    env,
    `INSERT INTO cinephone_projects (id, name, document, updated_at)
     VALUES (:id, :name, :doc, now())
     ON CONFLICT (id) DO UPDATE
       SET name = EXCLUDED.name, document = EXCLUDED.document, updated_at = now()`,
    [str('id', project.id), str('name', project.name ?? 'Untitled'), json('doc', body)],
  )
  return { ok: true }
}

export async function loadProject(env: AwsEnv, id: string): Promise<{ document: unknown | null }> {
  guard(env)
  await ensureSchema(env)
  const out = await exec(env, `SELECT document FROM cinephone_projects WHERE id = :id`, [str('id', id)])
  const recs = rows<{ document: unknown }>(out.formattedRecords)
  return { document: recs[0]?.document ?? null }
}

export async function listProjects(env: AwsEnv): Promise<{ projects: unknown[] }> {
  guard(env)
  await ensureSchema(env)
  const out = await exec(
    env,
    `SELECT id, name, updated_at FROM cinephone_projects ORDER BY updated_at DESC LIMIT 50`,
  )
  return { projects: rows(out.formattedRecords) }
}

/** Record one scene's generation result. */
export async function recordGeneration(env: AwsEnv, body: string): Promise<{ ok: true }> {
  guard(env)
  await ensureSchema(env)
  const g = JSON.parse(body) as {
    id: string
    projectId: string
    sceneId?: string
    prompt?: string
    lumaId?: string
    videoUrl?: string
    status?: string
  }
  await exec(
    env,
    `INSERT INTO cinephone_generations (id, project_id, scene_id, prompt, luma_id, video_url, status)
     VALUES (:id, :pid, :sid, :prompt, :luma, :url, :status)
     ON CONFLICT (id) DO UPDATE
       SET video_url = EXCLUDED.video_url, status = EXCLUDED.status`,
    [
      str('id', g.id),
      str('pid', g.projectId),
      str('sid', g.sceneId ?? ''),
      str('prompt', g.prompt ?? ''),
      str('luma', g.lumaId ?? ''),
      str('url', g.videoUrl ?? ''),
      str('status', g.status ?? ''),
    ],
  )
  return { ok: true }
}

export async function listGenerations(env: AwsEnv, projectId: string): Promise<{ generations: unknown[] }> {
  guard(env)
  await ensureSchema(env)
  const out = await exec(
    env,
    `SELECT id, scene_id, prompt, luma_id, video_url, status, created_at
       FROM cinephone_generations WHERE project_id = :pid ORDER BY created_at DESC LIMIT 200`,
    [str('pid', projectId)],
  )
  return { generations: rows(out.formattedRecords) }
}

// ---- Model catalog (S3 binaries + Aurora metadata) -------------------------

interface ModelSync {
  id: string
  kind: 'character' | 'prop'
  label: string
  /** Path relative to public/models, e.g. "Knight.glb" or "props/barrel.glb". */
  file: string
  scale: number
  clipAliases?: Record<string, string>
}

/** Upload bundled GLBs to S3 and upsert their catalog rows in Aurora. */
export async function syncModels(env: AwsEnv, body: string): Promise<{ synced: number }> {
  guard(env)
  if (!env.s3Bucket) throw new Error('S3_BUCKET not set')
  await ensureSchema(env)
  const { models } = JSON.parse(body) as { models: ModelSync[] }
  const s3 = makeS3(env)

  for (const m of models) {
    const s3Key = `models/${m.file}`
    const buf = await readFile(join(process.cwd(), 'public', 'models', m.file))
    await s3.send(
      new PutObjectCommand({
        Bucket: env.s3Bucket,
        Key: s3Key,
        Body: buf,
        ContentType: 'model/gltf-binary',
      }),
    )
    await exec(
      env,
      `INSERT INTO cinephone_models (id, kind, label, s3_key, scale, clip_aliases, updated_at)
       VALUES (:id, :kind, :label, :key, :scale, :aliases, now())
       ON CONFLICT (id) DO UPDATE
         SET kind = EXCLUDED.kind, label = EXCLUDED.label, s3_key = EXCLUDED.s3_key,
             scale = EXCLUDED.scale, clip_aliases = EXCLUDED.clip_aliases, updated_at = now()`,
      [
        str('id', m.id),
        str('kind', m.kind),
        str('label', m.label),
        str('key', s3Key),
        { name: 'scale', value: { doubleValue: m.scale } },
        json('aliases', JSON.stringify(m.clipAliases ?? {})),
      ],
    )
  }
  return { synced: models.length }
}

export async function listModels(env: AwsEnv): Promise<{ models: unknown[] }> {
  guard(env)
  await ensureSchema(env)
  const out = await exec(env, `SELECT id, kind, label, s3_key, scale, clip_aliases FROM cinephone_models`)
  return { models: rows(out.formattedRecords) }
}
