import { Euler, MathUtils, Quaternion, Vector3 } from 'three'
import type { OrientationReading } from '../types/motion'

/**
 * Pure math: convert a device-orientation reading into a camera quaternion.
 *
 * This is a port of the algorithm from the now-removed three.js
 * `DeviceOrientationControls`. It is deliberately free of React and the DOM so
 * it can be unit-tested in isolation and reused anywhere.
 *
 * Coordinate notes:
 *  - alpha (Z), beta (X), gamma (Y) arrive in degrees.
 *  - The Euler order is 'YXZ' to match the W3C device-orientation spec.
 *  - q1 rotates the frame so that looking "down the device" maps to looking
 *    forward in the world (the -90° about X correction).
 *  - q0 compensates for the current screen orientation (portrait/landscape).
 */

const zee = new Vector3(0, 0, 1)
const euler = new Euler()
const q0 = new Quaternion()
// -90° about the X axis: "camera points out the back of the phone".
const q1 = new Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5))

/**
 * @param reading        latest orientation reading (degrees)
 * @param screenAngle    `screen.orientation.angle` in degrees (0/90/180/270)
 * @param target         optional quaternion to write into (avoids allocation)
 * @returns the target quaternion, or null if the reading is incomplete
 */
export function readingToQuaternion(
  reading: OrientationReading,
  screenAngle: number,
  target: Quaternion = new Quaternion(),
): Quaternion | null {
  const { alpha, beta, gamma } = reading
  if (alpha === null || beta === null || gamma === null) return null

  const a = MathUtils.degToRad(alpha)
  const b = MathUtils.degToRad(beta)
  const g = MathUtils.degToRad(gamma)
  const orient = MathUtils.degToRad(screenAngle)

  euler.set(b, a, -g, 'YXZ')
  target.setFromEuler(euler)
  target.multiply(q1)
  target.multiply(q0.setFromAxisAngle(zee, -orient))
  return target
}
