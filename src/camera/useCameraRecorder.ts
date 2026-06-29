import { useFrame } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { Quaternion, Vector3, type PerspectiveCamera } from 'three'
import { selectActiveScene, useEditorStore } from '../state/useEditorStore'
import type { CameraMode, CameraSample } from '../types/camera'

/** Don't sample faster than this (seconds) — keeps recordings compact. */
const SAMPLE_INTERVAL = 1 / 30

// Reused temporaries to avoid per-frame allocation during playback.
const a = new Vector3()
const b = new Vector3()
const qa = new Quaternion()
const qb = new Quaternion()

/**
 * Drives camera recording and playback off the editor store.
 *  - `recording`: samples the live camera pose into a ref buffer.
 *  - leaving `recording`: commits the buffer as the stored recording.
 *  - `playback`: interpolates the stored recording onto the camera, then stops.
 * No-ops in `live` mode.
 */
export function useCameraRecorder(cameraRef: React.RefObject<PerspectiveCamera | null>) {
  const cameraMode = useEditorStore((s) => s.cameraMode)
  const recording = useEditorStore((s) => selectActiveScene(s).recording)
  const commitRecording = useEditorStore((s) => s.commitRecording)
  const stopPlayback = useEditorStore((s) => s.stopPlayback)

  const buffer = useRef<CameraSample[]>([])
  const recStart = useRef<number | null>(null)
  const playStart = useRef<number | null>(null)
  const prevMode = useRef<CameraMode>('live')

  // Handle mode transitions (commit on stop, reset clocks on start).
  useEffect(() => {
    const prev = prevMode.current
    if (cameraMode === 'recording') {
      buffer.current = []
      recStart.current = null
    }
    if (prev === 'recording' && cameraMode !== 'recording') {
      const samples = buffer.current
      if (samples.length > 1) {
        commitRecording({ samples, duration: samples[samples.length - 1].t })
      }
    }
    if (cameraMode === 'playback') playStart.current = null
    prevMode.current = cameraMode
  }, [cameraMode, commitRecording])

  useFrame((state) => {
    const cam = cameraRef.current
    if (!cam) return
    const now = state.clock.elapsedTime

    if (cameraMode === 'recording') {
      if (recStart.current === null) recStart.current = now
      const t = now - recStart.current
      const last = buffer.current[buffer.current.length - 1]
      if (!last || t - last.t >= SAMPLE_INTERVAL) {
        buffer.current.push({
          t,
          position: [cam.position.x, cam.position.y, cam.position.z],
          quaternion: [cam.quaternion.x, cam.quaternion.y, cam.quaternion.z, cam.quaternion.w],
        })
      }
      return
    }

    if (cameraMode === 'playback' && recording && recording.samples.length > 1) {
      if (playStart.current === null) playStart.current = now
      const t = now - playStart.current
      const samples = recording.samples

      if (t >= recording.duration) {
        applySample(cam, samples[samples.length - 1])
        stopPlayback()
        return
      }

      // Find the segment [i-1, i] bracketing t (linear scan — clips are short).
      let i = 1
      while (i < samples.length && samples[i].t < t) i++
      const s0 = samples[i - 1]
      const s1 = samples[i] ?? s0
      const span = s1.t - s0.t || 1
      const alpha = Math.min(Math.max((t - s0.t) / span, 0), 1)

      a.set(...s0.position)
      b.set(...s1.position)
      cam.position.lerpVectors(a, b, alpha)
      qa.set(...s0.quaternion)
      qb.set(...s1.quaternion)
      cam.quaternion.copy(qa).slerp(qb, alpha)
    }
  })
}

function applySample(cam: PerspectiveCamera, s: CameraSample) {
  cam.position.set(...s.position)
  cam.quaternion.set(...s.quaternion)
}
