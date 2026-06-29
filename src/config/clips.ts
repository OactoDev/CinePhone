import type { ClipId } from '../types/film'

/**
 * The clip catalogue: each performable clip with the keywords that select it
 * and how it plays. `resolveClip` does plain word matching — no AI — to turn a
 * spoken action description into a clip ("...walks..." → 'walk').
 */
export interface ClipDef {
  id: ClipId
  label: string
  /** Locomotion/idle loop forever; one-shots (jump/wave/spin) revert to idle. */
  loop: boolean
  /** Seconds a one-shot plays before returning to idle (ignored when loop). */
  duration: number
  /** Whole-word triggers found in an action description. */
  keywords: string[]
}

export const CLIPS: ClipDef[] = [
  { id: 'walk', label: 'Walk', loop: true, duration: 0, keywords: ['walk', 'walks', 'walking', 'step', 'stroll'] },
  { id: 'run', label: 'Run', loop: true, duration: 0, keywords: ['run', 'runs', 'running', 'sprint', 'dash'] },
  { id: 'jump', label: 'Jump', loop: false, duration: 1.1, keywords: ['jump', 'jumps', 'jumping', 'hop', 'leap'] },
  { id: 'wave', label: 'Wave', loop: false, duration: 2, keywords: ['wave', 'waves', 'waving', 'hello', 'hi', 'greet'] },
  { id: 'spin', label: 'Spin', loop: false, duration: 1.4, keywords: ['spin', 'spins', 'turn', 'turns', 'rotate', 'twirl'] },
  { id: 'dance', label: 'Dance', loop: true, duration: 0, keywords: ['dance', 'dances', 'dancing', 'groove'] },
  { id: 'attack', label: 'Attack', loop: false, duration: 1.4, keywords: ['attack', 'fight', 'fights', 'punch', 'punches', 'hit', 'strike', 'swing'] },
  { id: 'sit', label: 'Sit', loop: true, duration: 0, keywords: ['sit', 'sits', 'sitting'] },
  { id: 'die', label: 'Die', loop: false, duration: 1.5, keywords: ['die', 'dies', 'death', 'fall', 'falls', 'collapse'] },
  { id: 'idle', label: 'Idle', loop: true, duration: 0, keywords: ['idle', 'stand', 'stands', 'stop', 'rest', 'wait'] },
]

const CLIP_BY_ID = new Map<ClipId, ClipDef>(CLIPS.map((c) => [c.id, c]))

export const getClip = (id: ClipId): ClipDef => CLIP_BY_ID.get(id) ?? CLIPS[CLIPS.length - 1]

/** Split text into lowercase word tokens. */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
}

/**
 * Map a spoken description to a clip by whole-word keyword match.
 * Returns null when nothing matches (caller can leave the action unresolved).
 */
export function resolveClip(description: string): ClipId | null {
  const words = new Set(tokenize(description))
  for (const clip of CLIPS) {
    if (clip.keywords.some((kw) => words.has(kw))) return clip.id
  }
  return null
}
