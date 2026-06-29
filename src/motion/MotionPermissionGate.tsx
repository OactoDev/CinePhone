import type { MotionPermission } from '../types/motion'

interface MotionPermissionGateProps {
  permission: MotionPermission
  onRequest: () => void
}

/**
 * The user-gesture entry point required by iOS. Renders an "Enable Motion"
 * button while permission is pending; nothing once granted/unsupported (the
 * desktop OrbitControls fallback covers those cases).
 */
export function MotionPermissionGate({ permission, onRequest }: MotionPermissionGateProps) {
  if (permission !== 'prompt' && permission !== 'denied') return null

  return (
    <div className="gate">
      <div className="gate__card">
        <h1 className="gate__title">CinePhone</h1>
        <p className="gate__body">
          {permission === 'denied'
            ? 'Motion access was blocked. Re-enable it in your browser settings, then try again.'
            : 'Move your phone to look around the studio. Tap below to enable motion sensors.'}
        </p>
        <button className="gate__button" type="button" onClick={onRequest}>
          Enable Motion
        </button>
      </div>
    </div>
  )
}
