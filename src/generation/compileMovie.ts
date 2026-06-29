import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile, toBlobURL } from '@ffmpeg/util'
import { proxiedAssetUrl } from './lumaClient'

/**
 * Compile the per-scene Luma clips into a single MP4, entirely in-browser via
 * ffmpeg.wasm. The wasm core (~30MB) is lazy-loaded from a CDN only when the
 * user compiles. Clips are fetched through our asset proxy to avoid CDN CORS.
 *
 * Tries a fast stream-copy concat first (Luma clips are uniform); falls back to
 * a re-encode if copy fails.
 */

const CORE_BASE = 'https://unpkg.com/@ffmpeg/core@0.12.10/dist/umd'

let ffmpegPromise: Promise<FFmpeg> | null = null

async function getFFmpeg(onProgress?: (p: number) => void): Promise<FFmpeg> {
  if (!ffmpegPromise) {
    ffmpegPromise = (async () => {
      const ffmpeg = new FFmpeg()
      await ffmpeg.load({
        coreURL: await toBlobURL(`${CORE_BASE}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${CORE_BASE}/ffmpeg-core.wasm`, 'application/wasm'),
      })
      return ffmpeg
    })()
  }
  const ffmpeg = await ffmpegPromise
  if (onProgress) ffmpeg.on('progress', ({ progress }) => onProgress(Math.min(1, progress)))
  return ffmpeg
}

/**
 * @param clipUrls ordered Luma video URLs (one per scene)
 * @returns an object URL for the compiled MP4 Blob
 */
export async function compileMovie(
  clipUrls: string[],
  onProgress?: (p: number) => void,
): Promise<string> {
  if (clipUrls.length === 0) throw new Error('No clips to compile')
  const ffmpeg = await getFFmpeg(onProgress)

  const names: string[] = []
  for (let i = 0; i < clipUrls.length; i++) {
    const name = `clip${i}.mp4`
    await ffmpeg.writeFile(name, await fetchFile(proxiedAssetUrl(clipUrls[i])))
    names.push(name)
  }

  // Single clip: nothing to concat.
  if (names.length === 1) {
    const data = await ffmpeg.readFile(names[0])
    return blobUrl(data)
  }

  const list = names.map((n) => `file '${n}'`).join('\n')
  await ffmpeg.writeFile('list.txt', list)

  try {
    await ffmpeg.exec(['-f', 'concat', '-safe', '0', '-i', 'list.txt', '-c', 'copy', 'out.mp4'])
  } catch {
    // Re-encode fallback if stream-copy concat fails (mismatched params).
    await ffmpeg.exec([
      '-f', 'concat', '-safe', '0', '-i', 'list.txt',
      '-c:v', 'libx264', '-preset', 'veryfast', '-pix_fmt', 'yuv420p', 'out.mp4',
    ])
  }

  const data = await ffmpeg.readFile('out.mp4')
  return blobUrl(data)
}

function blobUrl(data: Uint8Array | string): string {
  const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data
  return URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'video/mp4' }))
}
