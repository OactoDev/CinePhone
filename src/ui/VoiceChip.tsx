import type { VoiceState } from '../types/voice'
import { MicIcon } from './icons'

interface VoiceChipProps {
  voice: VoiceState
}

/**
 * Top transcript chip: a pulsing mic dot plus the live (interim) transcript.
 * Hidden entirely when speech recognition is unsupported. Listening-only — the
 * transcript isn't wired to any actions yet.
 */
export function VoiceChip({ voice }: VoiceChipProps) {
  if (!voice.supported) return null

  return (
    <div className={`voice ${voice.listening ? 'is-listening' : ''}`}>
      <span className="voice__mic">
        <MicIcon />
      </span>
      <span className="voice__text">
        {voice.transcript || (voice.listening ? 'Listening…' : 'Voice idle')}
      </span>
    </div>
  )
}
