/**
 * Data contracts for camera recording / playback.
 */
import type { Vec3 } from './scene'

export type CameraMode = 'live' | 'recording' | 'playback'

/** A single sampled camera pose along a recording. */
export interface CameraSample {
  /** Seconds since the recording started. */
  t: number
  position: Vec3
  /** Quaternion as [x, y, z, w]. */
  quaternion: [number, number, number, number]
}

/** A completed recording: ordered samples + total duration in seconds. */
export interface CameraRecording {
  samples: CameraSample[]
  duration: number
}
