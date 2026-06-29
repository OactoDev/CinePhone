/**
 * Luma generation + image-host configuration, from VITE_ env vars with sane
 * defaults. The Luma API *key* is NOT here — it stays server-side and is used
 * only by the dev proxy (see server/lumaProxy.ts). These client-side values are
 * just generation parameters and the (public, unsigned) image-host config.
 */

const env = import.meta.env

export const LUMA = {
  /** Our same-origin proxy base (keeps the key server-side). */
  proxyBase: '/api/luma',
  model: (env.VITE_LUMA_MODEL as string) ?? 'ray-2',
  duration: (env.VITE_LUMA_DURATION as string) ?? '5s',
  resolution: (env.VITE_LUMA_RESOLUTION as string) ?? '720p',
  aspectRatio: (env.VITE_LUMA_ASPECT as string) ?? '16:9',
  /** Poll cadence + ceiling for a single generation. */
  pollIntervalMs: 4000,
  pollTimeoutMs: 10 * 60 * 1000,
  /** Concurrent scene generations (Luma build tier allows ~10). */
  concurrency: 3,
} as const

// Image hosting + persistence are server-side (S3 + Aurora). The client checks
// availability at runtime via `getHealth()` in src/cloud/storageClient.ts.
