import { useCallback, useState } from 'react'
import { resolveClip } from '../config/clips'
import { selectActiveScene, useEditorStore, type DirectedBeat } from '../state/useEditorStore'
import { buildContext } from './buildContext'

/**
 * AI director: turn the active scene's synopsis into an ordered list of beats
 * (`/api/direct`, Opus). On failure/unconfigured, falls back to splitting the
 * synopsis into sentences — one keyword-clip beat each — so it still works
 * offline. Beats are written into the scene's shot list (replace or append).
 */
export function useDirector() {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const addDirectedBeats = useEditorStore((s) => s.addDirectedBeats)

  const directScene = useCallback(
    async (synopsis: string, replace: boolean) => {
      const text = synopsis.trim()
      if (!text) return
      setBusy(true)
      setError(null)
      const scene = selectActiveScene(useEditorStore.getState())
      const context = buildContext(scene)
      try {
        const res = await fetch('/api/direct', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ synopsis: text, context }),
        })
        if (res.ok) {
          const data = (await res.json()) as { beats?: DirectedBeat[] }
          if (data?.beats?.length) {
            addDirectedBeats(data.beats, replace)
            return
          }
        } else {
          setError('Director unavailable — used a simple breakdown.')
        }
      } catch {
        setError('Director offline — used a simple breakdown.')
      }

      // Fallback: one beat per sentence, keyword-matched clip on the named/first character.
      const sentences = text.split(/[.!?\n]+/).map((s) => s.trim()).filter(Boolean)
      const beats: DirectedBeat[] = sentences.map((sentence) => {
        const words = new Set(sentence.toLowerCase().split(/\s+/))
        const target = scene.characters.find((c) => words.has(c.name.toLowerCase())) ?? scene.characters[0]
        const clip = resolveClip(sentence) ?? 'idle'
        return {
          title: sentence.length > 32 ? sentence.slice(0, 32) + '…' : sentence,
          steps: target ? [{ characterId: target.id, action: 'play', clip, durationSec: 4, repeat: 1 }] : [],
        }
      })
      addDirectedBeats(beats, replace)
    },
    [addDirectedBeats],
  )

  return { directScene, busy, error }
}
