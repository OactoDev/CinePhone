/** Small helpers for capturing frames off the WebGL canvas. */

/** Convert a data URL (e.g. from canvas.toDataURL) into a Blob for upload. */
export function dataUrlToBlob(dataUrl: string): Blob {
  const [head, b64] = dataUrl.split(',')
  const mime = /:(.*?);/.exec(head)?.[1] ?? 'image/jpeg'
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new Blob([bytes], { type: mime })
}

/** Await the next animation frame (lets a freshly-switched scene settle). */
export function nextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()))
}
