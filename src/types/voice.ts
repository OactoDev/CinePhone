/**
 * Data contract for the voice (speech-recognition) feature.
 * Listening + transcript only — no command actions are wired yet.
 */
export interface VoiceState {
  /** Whether the browser exposes the Web Speech API. */
  supported: boolean
  /** Whether recognition is currently running. */
  listening: boolean
  /** Latest (possibly interim) transcript text. */
  transcript: string
}
