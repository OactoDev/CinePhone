import { useCallback } from 'react'
import { resolveClip } from '../config/clips'
import { selectActiveScene, useEditorStore } from '../state/useEditorStore'
import type { AnimationPlan } from '../types/film'
import { buildContext } from './buildContext'

/**
 * Turn a spoken action into an AnimationPlan. Tries the server LLM choreographer
 * (`/api/choreograph`); if it's unconfigured/fails, falls back to a single-clip
 * plan via keyword matching so directing still works offline.
 */
export function useChoreographer() {
  return useCallback(async (action: string): Promise<AnimationPlan> => {
    const scene = selectActiveScene(useEditorStore.getState())
    const context = buildContext(scene)

    try {
      const res = await fetch('/api/choreograph', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action, context }),
      })
      if (res.ok) {
        const plan = (await res.json()) as AnimationPlan
        if (plan?.steps?.length) return plan
      }
    } catch {
      /* fall through to keyword plan */
    }

    // Keyword fallback: play the matched clip on the named (or first) character.
    const words = new Set(action.toLowerCase().split(/\s+/))
    const target = scene.characters.find((c) => words.has(c.name.toLowerCase())) ?? scene.characters[0]
    const clip = resolveClip(action) ?? 'idle'
    return { steps: target ? [{ characterId: target.id, action: 'play', clip, durationSec: 5, repeat: 1 }] : [] }
  }, [])
}
