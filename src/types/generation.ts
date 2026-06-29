/**
 * Data contracts for the "Generate Movie" phase: per-scene AI generation state
 * and the final compile. All transient (not persisted) — Luma asset URLs are
 * short-lived.
 */

export type SceneGenStatus =
  | 'idle'
  | 'capturing' // grabbing keyframes from the canvas
  | 'uploading' // pushing keyframes to a public host
  | 'queued' // Luma accepted the job
  | 'dreaming' // Luma is generating
  | 'completed' // clip ready (videoUrl set)
  | 'failed'

/** Generation record for a single scene. */
export interface SceneGeneration {
  sceneId: string
  status: SceneGenStatus
  /** Local data URL of the start frame, shown as the storyboard thumbnail. */
  thumbDataUrl?: string
  /** Public URLs handed to Luma as keyframes. */
  frame0Url?: string
  frame1Url?: string
  /** Luma generation id while in flight. */
  generationId?: string
  /** Final clip URL when completed. */
  videoUrl?: string
  error?: string
}

export type CompileStatus = 'idle' | 'loading' | 'compiling' | 'done' | 'failed'

export interface CompileState {
  status: CompileStatus
  /** Object URL of the compiled single MP4. */
  url?: string
  error?: string
  /** 0–1 progress while compiling. */
  progress: number
}
