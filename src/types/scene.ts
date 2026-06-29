/**
 * Data contracts for the 3D scene.
 * Pure type definitions — the single shape that `config/studio.ts` fills in
 * and the scene/camera components consume.
 */

export type Vec3 = [number, number, number]

/** Overall stage / atmosphere settings. */
export interface EnvironmentConfig {
  /** Background + fog colour (the "infinite" horizon the grid fades into). */
  background: string
  /** Exponential fog density; higher fades the grid sooner. */
  fogDensity: number
  /** drei lighting preset for image-based reflections. */
  preset: 'city' | 'studio' | 'sunset' | 'dawn' | 'warehouse' | 'apartment' | 'park' | 'lobby'
  /** Multiplier on the environment lighting intensity. */
  environmentIntensity: number
}

/** The infinite ground grid. */
export interface GridConfig {
  /** Size of a single small cell. */
  cellSize: number
  cellThickness: number
  cellColor: string
  /** Size of a major section (every Nth line is emphasised). */
  sectionSize: number
  sectionThickness: number
  sectionColor: string
  /** Distance at which the grid fades into the fog. */
  fadeDistance: number
  fadeStrength: number
}

/** Camera rig configuration. */
export interface CameraConfig {
  /** Vertical field of view in degrees. */
  fov: number
  /** Fixed position of the camera (eye height above the grid). */
  position: Vec3
  /**
   * Slerp factor applied per frame toward the target orientation (0–1).
   * Lower = smoother/laggier, higher = snappier. This is what makes the
   * phone-driven camera feel fluid instead of jittery.
   */
  smoothing: number
}
