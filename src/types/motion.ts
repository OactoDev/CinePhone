/**
 * Data contracts for the device-motion domain.
 * Pure type definitions — no logic, no imports. Shared across hooks, math, and UI.
 */

/** A single raw reading from the `deviceorientation` event (degrees). */
export interface OrientationReading {
  /** Rotation around the Z axis, 0–360. `null` until the first event arrives. */
  alpha: number | null
  /** Front-to-back tilt around the X axis, -180–180. */
  beta: number | null
  /** Left-to-right tilt around the Y axis, -90–90. */
  gamma: number | null
  /** Whether the reading is relative to true north (absolute) or arbitrary. */
  absolute: boolean
}

/** Lifecycle of the user's permission to read motion sensors. */
export type MotionPermission =
  | 'unknown' // not yet determined
  | 'unsupported' // device/browser has no orientation sensor
  | 'prompt' // permission required (iOS) and not yet granted
  | 'granted' // listening is allowed
  | 'denied' // user rejected the prompt

/** Aggregate live state consumed by the camera rig. */
export interface MotionState {
  reading: OrientationReading
  /** `window.screen.orientation.angle` — 0 / 90 / 180 / 270. */
  screenOrientation: number
  /** True once we are receiving live orientation events. */
  active: boolean
}

export const EMPTY_READING: OrientationReading = {
  alpha: null,
  beta: null,
  gamma: null,
  absolute: false,
}
