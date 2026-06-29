import type { Project } from '../types/project'

/**
 * Client for the server-side cloud APIs (S3 storage + Aurora). All secrets live
 * on the server (the Vite dev middleware / future backend); the browser only
 * talks to these same-origin `/api/*` routes.
 */

export interface CloudHealth {
  storage: boolean
  aurora: boolean
  luma: boolean
  llm: boolean
}

export async function getHealth(): Promise<CloudHealth> {
  try {
    const res = await fetch('/api/health')
    if (!res.ok) return { storage: false, aurora: false, luma: false, llm: false }
    return (await res.json()) as CloudHealth
  } catch {
    return { storage: false, aurora: false, luma: false, llm: false }
  }
}

/** Upload a captured keyframe (data URL) to S3; returns a Luma-fetchable URL. */
export async function uploadKeyframe(dataUrl: string, key: string): Promise<string> {
  const res = await fetch('/api/storage/upload', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ dataUrl, key }),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json?.error ?? `Upload failed (${res.status})`)
  return json.url as string
}

// ---- Aurora (projects + generations) -----------------------------------

export async function saveProjectCloud(project: Project): Promise<void> {
  const res = await fetch('/api/db/project', {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(project),
  })
  if (!res.ok) throw new Error((await res.json())?.error ?? 'Save failed')
}

export async function loadProjectCloud(id: string): Promise<Project | null> {
  const res = await fetch(`/api/db/project?id=${encodeURIComponent(id)}`)
  if (!res.ok) throw new Error((await res.json())?.error ?? 'Load failed')
  const doc = (await res.json()).document
  if (!doc) return null
  // The RDS Data API returns the jsonb column as a JSON *string* — parse it.
  return (typeof doc === 'string' ? JSON.parse(doc) : doc) as Project
}

export interface ProjectSummary {
  id: string
  name: string
  updated_at: string
}

export async function listProjectsCloud(): Promise<ProjectSummary[]> {
  const res = await fetch('/api/db/projects')
  if (!res.ok) return []
  return ((await res.json()).projects as ProjectSummary[]) ?? []
}

export interface GenerationRecord {
  id: string
  projectId: string
  sceneId?: string
  prompt?: string
  lumaId?: string
  videoUrl?: string
  status?: string
}

export async function recordGenerationCloud(rec: GenerationRecord): Promise<void> {
  // Best-effort: never block the pipeline on history writes.
  try {
    await fetch('/api/db/generation', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(rec),
    })
  } catch {
    /* ignore */
  }
}

/** A row from the generations history (as returned by Aurora). */
export interface GenerationRow {
  id: string
  scene_id: string
  prompt: string
  luma_id: string
  video_url: string
  status: string
  created_at: string
}

export async function listGenerationsCloud(projectId: string): Promise<GenerationRow[]> {
  try {
    const res = await fetch(`/api/db/generations?projectId=${encodeURIComponent(projectId)}`)
    if (!res.ok) return []
    return ((await res.json()).generations as GenerationRow[]) ?? []
  } catch {
    return []
  }
}
