import { useEditorStore } from '../state/useEditorStore'
import { CameraIcon, CubeIcon, PlayIcon, StopIcon } from './icons'

/**
 * The right-side vertical pill rail (matches the reference screenshot):
 * Play/Stop preview, Library (cube), Camera. Only one panel is open at a time;
 * tapping an active button closes its panel.
 */
export function ControlRail() {
  const panel = useEditorStore((s) => s.panel)
  const preview = useEditorStore((s) => s.preview)
  const openPanel = useEditorStore((s) => s.openPanel)
  const closePanel = useEditorStore((s) => s.closePanel)
  const togglePreview = useEditorStore((s) => s.togglePreview)

  const toggle = (target: 'library' | 'camera') =>
    panel === target ? closePanel() : openPanel(target)

  return (
    <nav className="rail" aria-label="Scene controls">
      <button
        type="button"
        className={`rail__btn ${preview ? 'is-active' : ''}`}
        aria-label={preview ? 'Stop preview' : 'Play preview'}
        aria-pressed={preview}
        onClick={togglePreview}
      >
        {preview ? <StopIcon /> : <PlayIcon />}
      </button>

      <button
        type="button"
        className={`rail__btn ${panel === 'library' ? 'is-active' : ''}`}
        aria-label="Terrain & objects library"
        aria-pressed={panel === 'library'}
        onClick={() => toggle('library')}
      >
        <CubeIcon />
      </button>

      <button
        type="button"
        className={`rail__btn ${panel === 'camera' ? 'is-active' : ''}`}
        aria-label="Camera mode"
        aria-pressed={panel === 'camera'}
        onClick={() => toggle('camera')}
      >
        <CameraIcon />
      </button>
    </nav>
  )
}
