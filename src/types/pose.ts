/**
 * Data contracts for 6DoF camera tracking.
 *
 * A `PoseSource` is an SDK-agnostic provider of a 6DoF camera pose. Today the
 * only free source that works in iOS Safari is marker-based (AR.js), but any
 * future provider (WebXR, 8th Wall, …) can implement the same interface and be
 * dropped in without touching the camera rig or scene.
 */
import type { Vec3 } from './scene'

export type PoseStatus =
  | 'idle' // not started
  | 'starting' // requesting camera / loading runtime
  | 'tracking' // pose is live
  | 'searching' // running but marker/anchor not currently found
  | 'unsupported' // device/browser can't provide a pose
  | 'error' // failed to start

/** A 6DoF pose: world position + orientation. */
export interface Pose6DoF {
  position: Vec3
  /** Quaternion [x, y, z, w]. */
  quaternion: [number, number, number, number]
}

/** Lifecycle + per-frame contract every tracking backend implements. */
export interface PoseSource {
  /** Begin tracking (camera permission, runtime load). Must be user-gesture safe. */
  start: () => Promise<void>
  /** Stop tracking and release the camera. */
  stop: () => void
  /** Called once per render frame; returns the latest pose or null if none yet. */
  update: () => Pose6DoF | null
  status: () => PoseStatus
}
