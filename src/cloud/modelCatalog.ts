import { CHARACTER_PRESETS } from '../config/characters'
import { PROP_PRESETS } from '../config/props'

/**
 * Client side of the cloud model catalog. Models are uploaded to S3 + cataloged
 * in Aurora; the app then loads their binaries through the `/api/storage/model`
 * proxy. Falls back to the bundled `public/models/*` files when the catalog
 * isn't available.
 */

/** Proxy URL that streams a model from S3 by its catalog key. */
export const modelProxyUrl = (s3Key: string) =>
  `/api/storage/model?key=${encodeURIComponent(s3Key)}`

const fileFromUrl = (modelUrl: string) => modelUrl.replace('/models/', '')

/** Build the upload manifest from the local config (config stays the source of metadata). */
function syncManifest() {
  return [
    ...CHARACTER_PRESETS.map((p) => ({
      id: p.id,
      kind: 'character' as const,
      label: p.label,
      file: fileFromUrl(p.modelUrl),
      scale: p.scale,
      clipAliases: p.clipAliases,
    })),
    ...PROP_PRESETS.map((p) => ({
      id: p.id,
      kind: 'prop' as const,
      label: p.label,
      file: fileFromUrl(p.modelUrl),
      scale: p.scale,
      clipAliases: {},
    })),
  ]
}

/** Upload all bundled models to S3 + register them in Aurora. */
export async function syncModelsCloud(): Promise<number> {
  const res = await fetch('/api/db/sync-models', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ models: syncManifest() }),
  })
  if (!res.ok) throw new Error((await res.json())?.error ?? 'Sync failed')
  return ((await res.json()).synced as number) ?? 0
}

interface ModelRow {
  id: string
  s3_key: string
}

/** Load the catalog → map of presetId → s3 key (empty if none/unconfigured). */
export async function loadModelCatalog(): Promise<Record<string, string>> {
  try {
    const res = await fetch('/api/db/models')
    if (!res.ok) return {}
    const rows = ((await res.json()).models as ModelRow[]) ?? []
    return Object.fromEntries(rows.map((r) => [r.id, r.s3_key]))
  } catch {
    return {}
  }
}
