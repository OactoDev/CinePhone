/**
 * AR (camera tracking) configuration, sourced from VITE_ env vars with sane
 * defaults so the app runs without a custom .env. AR.js is free and needs no
 * API key — these just point at the runtime/marker and tune motion scale.
 */

const env = import.meta.env

/** Map a marker preset name to AR.js's hosted .patt URL. */
function markerPatternUrl(marker: string): string {
  const base = 'https://cdn.jsdelivr.net/gh/AR-js-org/AR.js@3.4.5/three.js/examples/marker-training/examples/pattern-files/'
  if (marker === 'kanji') return `${base}pattern-kanji.patt`
  if (marker === 'hiro') return `${base}pattern-hiro.patt`
  return marker // treat as a full custom URL
}

export const AR_CONFIG = {
  /** URL of the AR.js three.js runtime, loaded lazily at runtime. */
  runtimeUrl:
    env.VITE_ARJS_URL ??
    'https://cdn.jsdelivr.net/gh/AR-js-org/AR.js@3.4.5/three.js/build/ar-threex.js',
  /** Camera calibration data (AR.js default works for most phone cameras). */
  cameraParamUrl:
    'https://cdn.jsdelivr.net/gh/AR-js-org/AR.js@3.4.5/data/data/camera_para.dat',
  marker: (env.VITE_AR_MARKER as string) ?? 'hiro',
  get markerPatternUrl() {
    return markerPatternUrl(this.marker)
  },
  /** Physical marker size in metres. */
  markerSize: Number(env.VITE_AR_MARKER_SIZE ?? 0.15),
  /** Multiplier from tracked metres → scene units. */
  poseScale: Number(env.VITE_AR_POSE_SCALE ?? 8),
} as const

/** Human-readable marker name for instructions. */
export const AR_MARKER_LABEL = AR_CONFIG.marker === 'kanji' ? 'Kanji' : 'Hiro'
