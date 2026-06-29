import { AR_MARKER_LABEL } from '../config/ar'
import { useEditorStore } from '../state/useEditorStore'
import type { PoseStatus } from '../types/pose'
import { CloseIcon } from './icons'

const MESSAGES: Record<PoseStatus, string> = {
  idle: '',
  starting: 'Starting camera…',
  searching: `Point the camera at the ${AR_MARKER_LABEL} marker`,
  tracking: 'Tracking — walk around to move through the scene',
  unsupported: 'Camera tracking isn’t available on this device/browser',
  error: 'Couldn’t start the camera. Check permissions and retry.',
}

/**
 * On-screen guidance while AR (6DoF) mode is active. The white scene is rendered
 * over the camera feed, so this thin overlay is the only AR chrome: a status
 * line, a marker hint, and an exit button.
 */
export function ArOverlay() {
  const arActive = useEditorStore((s) => s.arActive)
  const arStatus = useEditorStore((s) => s.arStatus)
  const toggleAr = useEditorStore((s) => s.toggleAr)

  if (!arActive) return null
  const tracking = arStatus === 'tracking'

  return (
    <div className="ar">
      <div className={`ar__status ${tracking ? 'is-tracking' : ''}`}>
        <span className={`ar__dot ${tracking ? 'is-tracking' : ''}`} />
        <span>{MESSAGES[arStatus]}</span>
      </div>
      <button type="button" className="ar__exit" onClick={toggleAr}>
        <CloseIcon size={16} /> Exit AR
      </button>
    </div>
  )
}
