import type { ClipId } from '../types/film'

/**
 * Bundled rigged GLB characters. The fantasy cast is KayKit (CC0) — adventurers
 * + skeletons — which all share one rich, consistently-named animation library,
 * so they reuse a single alias map. Plus a couple of fun extras (Robot, Fox).
 *
 * Sources (all CC0 — credited in the README):
 *  - KayKit Character Pack: Adventurers (Knight/Barbarian/Mage/Rogue)
 *  - KayKit Character Pack: Skeletons (Warrior/Mage/Minion) — the "enemies"
 *  - three.js RobotExpressive; Khronos Fox
 *
 * Add your own by dropping a .glb in public/models/ and adding an entry here.
 */
export interface CharacterPreset {
  id: string
  label: string
  modelUrl: string
  scale: number
  clipAliases: Partial<Record<ClipId, string>>
}

/** Canonical → KayKit clip names (identical across all KayKit characters). */
const KAYKIT: Partial<Record<ClipId, string>> = {
  idle: 'Idle',
  walk: 'Walking_A',
  run: 'Running_A',
  jump: 'Jump_Full_Long',
  wave: 'Cheer',
  dance: 'Cheer',
  spin: '2H_Melee_Attack_Spin',
  attack: '1H_Melee_Attack_Chop',
  sit: 'Sit_Floor_Idle',
  die: 'Death_A',
}

const KAYKIT_SCALE = 1

export const CHARACTER_PRESETS: CharacterPreset[] = [
  { id: 'knight', label: 'Knight', modelUrl: '/models/Knight.glb', scale: KAYKIT_SCALE, clipAliases: KAYKIT },
  { id: 'barbarian', label: 'Barbarian', modelUrl: '/models/Barbarian.glb', scale: KAYKIT_SCALE, clipAliases: KAYKIT },
  { id: 'mage', label: 'Mage', modelUrl: '/models/Mage.glb', scale: KAYKIT_SCALE, clipAliases: KAYKIT },
  { id: 'rogue', label: 'Rogue', modelUrl: '/models/Rogue.glb', scale: KAYKIT_SCALE, clipAliases: KAYKIT },
  { id: 'skeleton', label: 'Skeleton', modelUrl: '/models/Skeleton_Warrior.glb', scale: KAYKIT_SCALE, clipAliases: KAYKIT },
  { id: 'skeleton_mage', label: 'Skeleton Mage', modelUrl: '/models/Skeleton_Mage.glb', scale: KAYKIT_SCALE, clipAliases: KAYKIT },
  { id: 'skeleton_minion', label: 'Skeleton Minion', modelUrl: '/models/Skeleton_Minion.glb', scale: KAYKIT_SCALE, clipAliases: KAYKIT },
  {
    id: 'robot',
    label: 'Robot',
    modelUrl: '/models/Robot.glb',
    scale: 0.4,
    clipAliases: {
      idle: 'Idle',
      walk: 'Walking',
      run: 'Running',
      jump: 'Jump',
      wave: 'Wave',
      dance: 'Dance',
      attack: 'Punch',
      sit: 'Sitting',
      die: 'Death',
    },
  },
  {
    id: 'fox',
    label: 'Fox',
    modelUrl: '/models/Fox.glb',
    scale: 0.025,
    clipAliases: { idle: 'Survey', walk: 'Walk', run: 'Run' },
  },
]

export const getPreset = (id?: string): CharacterPreset | undefined =>
  CHARACTER_PRESETS.find((p) => p.id === id)

/** Resolve a canonical clip to a rig clip name, falling back to idle then any. */
export function resolveClipName(preset: CharacterPreset, clip: ClipId): string | undefined {
  return preset.clipAliases[clip] ?? preset.clipAliases.idle
}
