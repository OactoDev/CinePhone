import { useCallback, useRef } from 'react'
import { useChoreographer } from '../choreo/useChoreographer'
import { useEditorStore } from '../state/useEditorStore'
import type { VoiceState } from '../types/voice'
import { CommandProcessor, type CommandEvent } from './commandGrammar'
import { useSpeechRecognition } from './useSpeechRecognition'

/**
 * The bridge: speech (or typed text) → command grammar → store mutations.
 *
 * Finalized speech phrases are fed to a persistent `CommandProcessor` (so
 * markers split across phrases still parse), and each emitted event is mapped
 * to a store action. "create action" appends an Action; the words until
 * "end action" become its description, which is mapped to a clip and performed
 * live by the referenced character.
 *
 * Returns the voice state (for the chip) plus `submitCommand` for a manual
 * director's input — handy on desktop and where speech isn't supported.
 */
export function useVoiceCommands(): { voice: VoiceState; submitCommand: (text: string) => void } {
  const processorRef = useRef<CommandProcessor | null>(null)
  if (!processorRef.current) processorRef.current = new CommandProcessor()
  const choreograph = useChoreographer()

  const dispatch = useCallback(
    (events: CommandEvent[]) => {
      const store = useEditorStore.getState()
      for (const ev of events) {
        switch (ev.type) {
          case 'beginAction':
            store.beginAction()
            break
          case 'updateDescription':
            store.updateDraftDescription(ev.description)
            break
          case 'endAction': {
            const actionId = store.draftActionId // capture before endAction clears it
            store.endAction(ev.description) // immediate keyword performance
            // Upgrade to a contextual multi-step plan from the choreographer.
            if (ev.description.trim()) {
              choreograph(ev.description).then((plan) => {
                if (!plan.steps.length) return
                const s = useEditorStore.getState()
                if (actionId) s.setActionPlan(actionId, plan) // store for preview replay
                s.setPlan(plan) // animate now
              })
            }
            break
          }
          case 'newScene':
            store.addScene()
            break
          case 'endScene':
            store.endScene()
            break
        }
      }
    },
    [choreograph],
  )

  const onFinal = useCallback(
    (text: string) => dispatch(processorRef.current!.feed(text)),
    [dispatch],
  )

  const voice = useSpeechRecognition({ onFinal })

  const submitCommand = useCallback(
    (text: string) => dispatch(processorRef.current!.feed(text)),
    [dispatch],
  )

  return { voice, submitCommand }
}
