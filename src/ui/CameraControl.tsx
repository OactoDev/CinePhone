import { selectActiveScene, useEditorStore } from '../state/useEditorStore'
import { PlayIcon, RecordIcon, StopIcon } from './icons'

/**
 * Full-screen, thumb-friendly camera controller shown on the phone after the
 * desktop→device handoff (`?camera=1`). Records a camera move using the device's
 * motion sensors; the clip autosaves to the cloud project for the desktop.
 */
export function CameraControl() {
  const projectName = useEditorStore((s) => s.project.name)
  const sceneName = useEditorStore((s) => selectActiveScene(s).name)
  const cameraMode = useEditorStore((s) => s.cameraMode)
  const recording = useEditorStore((s) => selectActiveScene(s).recording)
  const fov = useEditorStore((s) => selectActiveScene(s).fov)
  const startRecording = useEditorStore((s) => s.startRecording)
  const stopRecording = useEditorStore((s) => s.stopRecording)
  const playRecording = useEditorStore((s) => s.playRecording)
  const stopPlayback = useEditorStore((s) => s.stopPlayback)
  const setFov = useEditorStore((s) => s.setFov)

  const isRecording = cameraMode === 'recording'
  const isPlaying = cameraMode === 'playback'
  const hasRecording = !!recording

  return (
    <div className="camremote">
      <div className="camremote__top">
        <span className="camremote__eyebrow">Camera control</span>
        <span className="camremote__title">
          {projectName} · {sceneName}
        </span>
        {isRecording && <span className="camremote__rec">● REC</span>}
        {!isRecording && hasRecording && (
          <span className="camremote__saved">Saved to cloud · {recording!.duration.toFixed(1)}s</span>
        )}
      </div>

      <div className="camremote__bottom">
        <label className="slider slider--lg">
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

        <div className="camremote__actions">
          <button
            type="button"
            className="camremote__preview"
            onClick={() => (isPlaying ? stopPlayback() : playRecording())}
            disabled={!hasRecording || isRecording}
            aria-label={isPlaying ? 'Stop preview' : 'Preview'}
          >
            {isPlaying ? <StopIcon size={26} /> : <PlayIcon size={24} />}
          </button>

          <button
            type="button"
            className={`camremote__record ${isRecording ? 'is-rec' : ''}`}
            onClick={() => (isRecording ? stopRecording() : startRecording())}
            disabled={isPlaying}
            aria-label={isRecording ? 'Stop recording' : 'Record'}
          >
            {isRecording ? <StopIcon size={34} /> : <RecordIcon size={34} />}
          </button>

          <div className="camremote__spacer" />
        </div>

        <p className="camremote__hint">
          {isRecording
            ? 'Move your phone to fly the camera. Tap to stop.'
            : hasRecording
              ? 'Clip saved — head back to your computer, or re-record.'
              : 'Tap record, then move your phone to fly the camera.'}
        </p>
      </div>
    </div>
  )
}
