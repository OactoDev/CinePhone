import { tokenize } from '../config/clips'

/**
 * Voice command grammar — detects directing markers inside free speech and
 * captures the words between them as an action description.
 *
 *   begin a beat:  "create action", "create an action", "start the action",
 *                  "new action", "begin action", "make a shot"…
 *   end a beat:    "end action", "stop the action", "finish action", "cut", "done"
 *   scene:         "new scene" / "next scene" / "end scene"
 *
 * Matching is forgiving: a verb may be followed by filler words (a/an/the/new/…)
 * before the noun, so natural phrasings work. The parser is a word-by-word state
 * machine, so markers split across streaming speech results still parse. Pure:
 * feed it finalized text, get back events.
 */

export type CommandEvent =
  | { type: 'beginAction' }
  | { type: 'updateDescription'; description: string }
  | { type: 'endAction'; description: string }
  | { type: 'newScene' }
  | { type: 'endScene' }

const BEGIN_VERBS = new Set(['create', 'make', 'start', 'begin', 'new', 'next', 'add', 'record'])
const END_VERBS = new Set(['end', 'stop', 'finish', 'complete'])
/** Words allowed (and skipped) between a verb and its noun. */
const FILLER = new Set(['a', 'an', 'the', 'this', 'that', 'my', 'another', 'again', 'new', 'one'])
/** Standalone words that end an action with no noun (film-set shorthand). */
const END_SINGLE = new Set(['cut', 'done'])
const ACTION_NOUNS = new Set(['action', 'shot', 'beat'])
const SCENE_NOUNS = new Set(['scene'])
const LOOKAHEAD = 4 // verb + up to a few filler words + noun

type MarkerType = CommandEvent['type']
type Match = { type: MarkerType; length: number } | 'incomplete' | null

/** Detect a marker starting at `words[i]`. */
function detect(words: string[], i: number): Match {
  const w = words[i]

  if (END_SINGLE.has(w)) return { type: 'endAction', length: 1 }

  const isBegin = BEGIN_VERBS.has(w)
  const isEnd = END_VERBS.has(w)
  if (!isBegin && !isEnd) return null

  // Scan forward, skipping filler, for an action/scene noun.
  for (let j = i + 1; j < words.length && j - i <= LOOKAHEAD; j++) {
    const t = words[j]
    if (ACTION_NOUNS.has(t)) return { type: isEnd ? 'endAction' : 'beginAction', length: j - i + 1 }
    if (SCENE_NOUNS.has(t)) return { type: isEnd ? 'endScene' : 'newScene', length: j - i + 1 }
    if (!FILLER.has(t)) return null // a real word broke the pattern — not a marker
  }
  // Ran out of words mid-pattern (only filler so far) → wait for more.
  return words.length - i <= LOOKAHEAD ? 'incomplete' : null
}

export class CommandProcessor {
  private words: string[] = []
  private cursor = 0
  private inAction = false
  private description: string[] = []

  feed(text: string): CommandEvent[] {
    this.words.push(...tokenize(text))
    const events: CommandEvent[] = []

    while (this.cursor < this.words.length) {
      const m = detect(this.words, this.cursor)
      if (m === 'incomplete') break // wait for the next chunk
      if (m) {
        this.handleMarker(m.type, events)
        this.cursor += m.length
        continue
      }
      // Normal word: collect into the description if we're inside an action.
      if (this.inAction) {
        this.description.push(this.words[this.cursor])
        events.push({ type: 'updateDescription', description: this.description.join(' ') })
      }
      this.cursor++
    }

    if (this.cursor > 512) {
      this.words = this.words.slice(this.cursor)
      this.cursor = 0
    }
    return events
  }

  private handleMarker(type: MarkerType, events: CommandEvent[]) {
    switch (type) {
      case 'beginAction':
        if (this.inAction) this.finishAction(events) // auto-close a dangling action
        this.inAction = true
        this.description = []
        events.push({ type: 'beginAction' })
        break
      case 'endAction':
        if (this.inAction) this.finishAction(events)
        break
      case 'newScene':
        if (this.inAction) this.finishAction(events)
        events.push({ type: 'newScene' })
        break
      case 'endScene':
        if (this.inAction) this.finishAction(events)
        events.push({ type: 'endScene' })
        break
      default:
        break
    }
  }

  private finishAction(events: CommandEvent[]) {
    events.push({ type: 'endAction', description: this.description.join(' ') })
    this.inAction = false
    this.description = []
  }

  reset() {
    this.words = []
    this.cursor = 0
    this.inAction = false
    this.description = []
  }
}
