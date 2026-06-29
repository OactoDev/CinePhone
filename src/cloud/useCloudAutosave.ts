import { useEffect } from 'react'
import { useEditorStore } from '../state/useEditorStore'
import { loadModelCatalog } from './modelCatalog'
import { getHealth, loadProjectCloud, saveProjectCloud } from './storageClient'

/**
 * Cloud sync: when Aurora is configured it is the **source of truth**.
 *  - On startup: load the model catalog (S3/Aurora) and the project from Aurora
 *    (by `?project=<id>` if present — used by the phone camera handoff — else the
 *    local project id). If none exists in the cloud yet, push the local one up.
 *  - Thereafter: autosave the project to Aurora on change (debounced).
 * localStorage stays as an offline cache.
 */
const DEBOUNCE_MS = 2000

export function useCloudAutosave() {
  useEffect(() => {
    let enabled = false
    let timer: ReturnType<typeof setTimeout> | undefined

    void (async () => {
      const health = await getHealth()
      if (!health.aurora) return
      enabled = true

      // Cloud model catalog (S3-hosted GLBs).
      const catalog = await loadModelCatalog()
      if (Object.keys(catalog).length) useEditorStore.getState().setModelCatalog(catalog)

      // Cloud-authoritative project load.
      const urlId = new URLSearchParams(window.location.search).get('project')
      const id = urlId ?? useEditorStore.getState().project.id
      try {
        const doc = await loadProjectCloud(id)
        // Only adopt a well-formed cloud project; never replace local with junk.
        if (doc && Array.isArray(doc.scenes) && doc.scenes.length > 0) {
          useEditorStore.getState().loadProjectDocument(doc)
        } else {
          await saveProjectCloud(useEditorStore.getState().project)
        }
      } catch {
        /* offline / not configured — keep local */
      }
    })()

    const unsub = useEditorStore.subscribe((state, prev) => {
      if (state.project === prev.project) return
      if (!enabled) return
      clearTimeout(timer)
      const project = state.project
      timer = setTimeout(() => {
        saveProjectCloud(project).catch(() => {})
      }, DEBOUNCE_MS)
    })

    return () => {
      clearTimeout(timer)
      unsub()
    }
  }, [])
}
