import { useEffect, useState } from 'react'
import { getPreset } from '../config/characters'
import { OBJECT_PALETTE } from '../config/library'
import { getProp } from '../config/props'
import { useEditorStore } from '../state/useEditorStore'

/**
 * Top-center transient status: a recording (REC) badge with a live timer while
 * the camera is recording, and a "tap the ground to place …" hint while a
 * library item is armed for placement. Both sit above the canvas, out of the way
 * of the rail/HUD.
 */
export function StatusOverlay() {
  const cameraMode = useEditorStore((s) => s.cameraMode)
  const stopRecording = useEditorStore((s) => s.stopRecording)
  const placing = useEditorStore((s) => s.placing)
  const setPlacing = useEditorStore((s) => s.setPlacing)
  const arActive = useEditorStore((s) => s.arActive)

  const recording = cameraMode === 'recording'
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    if (!recording) {
      setElapsed(0)
      return
    }
    const t0 = performance.now()
    const iv = setInterval(() => setElapsed((performance.now() - t0) / 1000), 200)
    return () => clearInterval(iv)
  }, [recording])

  // Cancel placement with Escape.
  useEffect(() => {
    if (!placing) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setPlacing(null)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [placing, setPlacing])

  if (arActive) return null

  const placeLabel = placing
    ? placing.type === 'character'
      ? (getPreset(placing.value)?.label ?? 'character')
      : placing.type === 'prop'
        ? (getProp(placing.value)?.label ?? 'prop')
        : (OBJECT_PALETTE.find((p) => p.kind === placing.value)?.label ?? placing.value)
    : null

  return (
    <div className="status-overlay">
      {recording && (
        <div className="rec-badge">
          <span className="rec-badge__dot" />
          REC {elapsed.toFixed(1)}s
          <button type="button" className="rec-badge__stop" onClick={stopRecording}>
            Stop
          </button>
        </div>
      )}
      {placeLabel && (
        <div className="place-hint">
          Tap the ground to place <strong>{placeLabel}</strong>
          <button type="button" className="place-hint__cancel" onClick={() => setPlacing(null)}>
            Cancel
          </button>
        </div>
      )}
    </div>
  )
}
