/**
 * Data contracts for the film structure + character animation.
 *
 *   Project → Scene → Action → Take
 *
 * An Action is a directed beat captured between voice markers; its description
 * is turned into an AnimationPlan (by the LLM choreographer, or a keyword
 * fallback) that the runtime executes on the rigged characters.
 */
import type { Vec3 } from './scene'

/** Canonical animation vocabulary. Each character maps these to its own rig
 *  clip names via `clipAliases` in config/characters.ts (missing → idle). */
export type ClipId =
  | 'idle'
  | 'walk'
  | 'run'
  | 'jump'
  | 'wave'
  | 'dance'
  | 'spin'
  | 'attack'
  | 'sit'
  | 'die'

/** A performer placed in a scene. */
export interface Character {
  id: string
  name: string
  position: Vec3
  /** Manual yaw offset (Euler radians); runtime facing is applied on the inner rig. */
  rotation: Vec3
  /** Manual scale multiplier (on top of the preset scale). */
  scale: number
  color: string
  /** Bundled GLB preset (config/characters.ts). Absent → procedural avatar. */
  presetId?: string
}

/** One recorded performance of an action. */
export interface Take {
  id: string
  clipId: ClipId
  createdAt: string
}

/** A directed beat within a scene. */
export interface Action {
  id: string
  /** Short beat name shown in the shot list / timeline (e.g. "Approach"). */
  title?: string
  description: string
  /** Primary clip (for the shot-list badge); the full plan drives playback. */
  clipId: ClipId | null
  characterId: string | null
  /** The choreographed plan (stored so the preview can replay the scene). */
  plan?: AnimationPlan
  takes: Take[]
  createdAt: string
}

// ---- Choreography ------------------------------------------------------------

/** One step the runtime executes on a character. */
export interface AnimationStep {
  characterId: string
  action: 'move' | 'face' | 'play' | 'wait'
  /** Clip to play (for `play`, or the locomotion clip during `move`). */
  clip?: ClipId
  /** Another entity (character/object/prop) to move toward or face. */
  targetId?: string
  /** Explicit ground destination [x, z] (alternative to targetId, for `move`). */
  to?: [number, number]
  /** Stop this many world units short of the target (for `move`). */
  distance?: number
  /** Seconds this step runs (looping clips) — runtime also stops `move` on arrival. */
  durationSec: number
  /** Repeat count for one-shot clips like attack (default 1). */
  repeat?: number
}

/** An ordered sequence of steps (possibly across multiple characters). */
export interface AnimationPlan {
  steps: AnimationStep[]
}
