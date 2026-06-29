import type { CameraConfig, EnvironmentConfig, GridConfig } from '../types/scene'

/**
 * Single source of truth for all scene tunables.
 * Adjust these values to retune the look and the feel of the camera —
 * nothing else in the app should hardcode geometry, colours, or smoothing.
 */

export const ENVIRONMENT: EnvironmentConfig = {
  background: '#f3f4f7', // near-white horizon
  fogDensity: 0.012,
  preset: 'city', // soft, neutral image-based lighting
  environmentIntensity: 0.85,
}

export const GRID: GridConfig = {
  cellSize: 1,
  cellThickness: 1,
  cellColor: '#c4c7cf', // light grey minor lines
  sectionSize: 10,
  sectionThickness: 1.4,
  sectionColor: '#9aa0ab', // slightly darker major lines
  fadeDistance: 90,
  fadeStrength: 1.2,
}

export const CAMERA: CameraConfig = {
  fov: 60,
  // Eye height standing on the grid, looking out across the plane.
  position: [0, 1.6, 0],
  // 0.12 ≈ pleasant follow lag at 60fps; raise toward 1 for snappier tracking.
  smoothing: 0.12,
}
