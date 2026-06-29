/**
 * fal.ai video generation config (client-side parameters only — the FAL_API_KEY
 * stays server-side in the dev proxy, see server/falProxy.ts).
 *
 * Default model is WAN image→video (`fal-ai/wan-i2v`) — a high-quality i2v
 * model, verified working end-to-end on this account. Swap `VITE_FAL_MODEL` to
 * try another high-level model, e.g.:
 *   - fal-ai/wan-i2v                       (default)
 *   - fal-ai/wan-pro/image-to-video
 *   - fal-ai/minimax/hailuo-02/standard/image-to-video
 *   - fal-ai/veo3/image-to-video           (Google Veo 3)
 *   - fal-ai/kling-video/v2.1/master/image-to-video
 *
 * NOTE: we send only the universally-accepted inputs (prompt + image_url) so the
 * default works across models; model-specific knobs (duration/aspect) are left
 * to each model's defaults to avoid 422 "extra field" rejections.
 */

const env = import.meta.env

export const FAL = {
  /** Same-origin proxy base (keeps the key server-side). */
  proxyBase: '/api/fal',
  model: (env.VITE_FAL_MODEL as string) ?? 'fal-ai/wan-i2v',
  /** Poll cadence + ceiling for a single generation. */
  pollIntervalMs: 4000,
  pollTimeoutMs: 10 * 60 * 1000,
  /** Concurrent scene generations. */
  concurrency: 3,
} as const
