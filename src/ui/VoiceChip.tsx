import { getClip } from '../config/clips'
import { selectDraftAction, useEditorStore } from '../state/useEditorStore'
import type { VoiceState } from '../types/voice'
import { MicIcon } from './icons'

interface VoiceChipProps {
  voice: VoiceState
}

/**
 * Top chip. Doubles as the live command monitor:
 *  - while an action is being dictated, shows a red dot + the captured
 *    description and the recognised clip;
 *  - otherwise shows the mic + interim transcript.
 * Hidden when speech is unsupported AND nothing is being dictated (the typed
 * director's input still works in that case).
 */
export function VoiceChip({ voice }: VoiceChipProps) {
  const draft = useEditorStore(selectDraftAction)

  if (!voice.supported && !draft) return null

  if (draft) {
    const clipLabel = draft.clipId ? getClip(draft.clipId).label : null
    return (
      <div className="voice is-recording">
        <span className="voice__rec" />
        <span className="voice__text">
          {draft.description ? draft.description : 'Action…'}
        </span>
        {clipLabel && <span className="voice__clip">{clipLabel}</span>}
      </div>
    )
  }

  return (
    <div className={`voice ${voice.listening ? 'is-listening' : ''}`}>
      <span className="voice__mic">
        <MicIcon />
      </span>
      <span className="voice__text">
        {voice.transcript || (voice.listening ? 'Listening… say “create action”' : 'Voice idle')}
      </span>
    </div>
  )
}
