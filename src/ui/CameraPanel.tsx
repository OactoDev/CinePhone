import { useState } from 'react'
import { loadProjectCloud } from '../cloud/storageClient'
import { selectActiveScene, useEditorStore } from '../state/useEditorStore'
import { BottomSheet } from './BottomSheet'
import { CameraHandoff } from './CameraHandoff'
import { PlayIcon, RecordIcon, StopIcon } from './icons'

/**
 * Camera mode: record a live camera move, preview it, and re-record if you
 * don't like it. The "timeline" is a playback progress bar driven purely by a
 * CSS animation sized to the recording duration (no per-frame React updates).
 */
export function CameraPanel() {
  const open = useEditorStore((s) => s.panel === 'camera')
  const closePanel = useEditorStore((s) => s.closePanel)
  const cameraMode = useEditorStore((s) => s.cameraMode)
  const recording = useEditorStore((s) => selectActiveScene(s).recording)
  const fov = useEditorStore((s) => selectActiveScene(s).fov)
  const startRecording = useEditorStore((s) => s.startRecording)
  const stopRecording = useEditorStore((s) => s.stopRecording)
  const playRecording = useEditorStore((s) => s.playRecording)
  const stopPlayback = useEditorStore((s) => s.stopPlayback)
  const clearRecording = useEditorStore((s) => s.clearRecording)
  const setFov = useEditorStore((s) => s.setFov)
  const projectId = useEditorStore((s) => s.project.id)
  const loadProjectDocument = useEditorStore((s) => s.loadProjectDocument)
  const [handoff, setHandoff] = useState(false)
  const [pullState, setPullState] = useState<string | null>(null)

  const isRecording = cameraMode === 'recording'
  const isPlaying = cameraMode === 'playback'
  const hasRecording = !!recording

  const hint = isRecording
    ? 'Recording — move the camera, then Stop.'
    : isPlaying
      ? 'Previewing…'
      : hasRecording
        ? `Clip ready · ${recording!.duration.toFixed(1)}s`
        : 'Record a camera move to create a clip.'

  if (handoff) {
    return (
      <BottomSheet open={open} title="Record on phone" onClose={closePanel}>
        <CameraHandoff onClose={() => setHandoff(false)} />
      </BottomSheet>
    )
  }

  return (
    <BottomSheet open={open} title="Camera" onClose={closePanel}>
      <p className="panel-hint">{hint}</p>

      <div className="cam-actions">
        <button
          type="button"
          className={`pill-btn ${isRecording ? 'pill-btn--rec is-active' : 'pill-btn--rec'}`}
          onClick={() => (isRecording ? stopRecording() : startRecording())}
          disabled={isPlaying}
        >
          {isRecording ? <StopIcon size={18} /> : <RecordIcon size={18} />}
          <span>{isRecording ? 'Stop' : hasRecording ? 'Re-record' : 'Record'}</span>
        </button>

        <button
          type="button"
          className="pill-btn"
          onClick={() => (isPlaying ? stopPlayback() : playRecording())}
          disabled={!hasRecording || isRecording}
        >
          {isPlaying ? <StopIcon size={18} /> : <PlayIcon size={18} />}
          <span>{isPlaying ? 'Stop' : 'Preview'}</span>
        </button>

        <button
          type="button"
          className="text-btn"
          onClick={clearRecording}
          disabled={!hasRecording || isRecording || isPlaying}
        >
          Clear
        </button>
      </div>

      {/* Timeline: the fill animates across `duration` seconds while playing. */}
      <div className="timeline">
        <div
          key={isPlaying ? 'play' : 'idle'}
          className={`timeline__fill ${isPlaying ? 'is-playing' : ''}`}
          style={isPlaying && recording ? { animationDuration: `${recording.duration}s` } : undefined}
        />
      </div>

      <label className="slider">
        <span className="slider__label">Field of view</span>
        <input
          type="range"
          min={30}
          max={100}
          step={1}
          value={fov}
          onChange={(e) => setFov(Number(e.target.value))}
        />
        <span className="slider__value">{fov}°</span>
      </label>

      <div className="cam-handoff-row">
        <button type="button" className="ghost-btn ghost-btn--sm" onClick={() => setHandoff(true)}>
          Record on phone
        </button>
        <button
          type="button"
          className="ghost-btn ghost-btn--sm"
          onClick={async () => {
            setPullState('Pulling…')
            try {
              const doc = await loadProjectCloud(projectId)
              if (doc) {
                loadProjectDocument(doc)
                setPullState('Pulled latest')
              } else setPullState('Nothing in cloud')
            } catch {
              setPullState('Pull failed')
            }
          }}
        >
          Pull from cloud
        </button>
      </div>
      {pullState && <p className="panel-hint">{pullState}</p>}
    </BottomSheet>
  )
}
