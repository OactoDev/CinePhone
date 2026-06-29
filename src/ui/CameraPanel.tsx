import { useEditorStore } from '../state/useEditorStore'
import { BottomSheet } from './BottomSheet'
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
  const recording = useEditorStore((s) => s.recording)
  const fov = useEditorStore((s) => s.fov)
  const startRecording = useEditorStore((s) => s.startRecording)
  const stopRecording = useEditorStore((s) => s.stopRecording)
  const playRecording = useEditorStore((s) => s.playRecording)
  const stopPlayback = useEditorStore((s) => s.stopPlayback)
  const clearRecording = useEditorStore((s) => s.clearRecording)
  const setFov = useEditorStore((s) => s.setFov)

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
    </BottomSheet>
  )
}
