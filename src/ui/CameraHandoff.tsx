import QRCode from 'qrcode'
import { useEffect, useState } from 'react'
import { handoffUrl } from '../camera/cameraRemote'
import { useEditorStore } from '../state/useEditorStore'

/**
 * Desktop→device handoff card: shows a QR + link that opens this project on the
 * phone in camera-control mode. Scan it, record on the phone; the clip syncs
 * back via the cloud project.
 */
export function CameraHandoff({ onClose }: { onClose: () => void }) {
  const projectId = useEditorStore((s) => s.project.id)
  const url = handoffUrl(projectId)
  const [qr, setQr] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    QRCode.toDataURL(url, { width: 240, margin: 1 }).then(setQr).catch(() => setQr(''))
  }, [url])

  return (
    <div className="handoff">
      <p className="panel-hint">Scan with your phone to record the camera move there.</p>
      {qr && <img className="handoff__qr" src={qr} alt="Scan to open on phone" width={200} height={200} />}
      <div className="handoff__url">{url}</div>
      <div className="cam-actions">
        <button
          type="button"
          className="pill-btn"
          onClick={() => {
            navigator.clipboard?.writeText(url).then(() => setCopied(true))
          }}
        >
          <span>{copied ? 'Copied' : 'Copy link'}</span>
        </button>
        <button type="button" className="text-btn" onClick={onClose}>
          Done
        </button>
      </div>
      <p className="panel-hint handoff__note">
        Same Wi-Fi required. After recording, tap “Pull from cloud” here to load the clip.
      </p>
    </div>
  )
}
