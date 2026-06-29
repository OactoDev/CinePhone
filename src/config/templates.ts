import type { ObjectKind } from '../types/objects'
import type { Vec3 } from '../types/scene'

/**
 * Premade cinematic scenes — composed from the bundled environment/terrain
 * presets, GLB characters and props, arranged for a ready-to-shoot look. Loaded
 * via `addSceneFromTemplate`.
 */
export interface SceneTemplate {
  id: string
  label: string
  environmentId: string
  terrainId: string
  characters: { presetId: string; position: Vec3 }[]
  props: { presetId: string; position: Vec3 }[]
  objects: { kind: ObjectKind; position: Vec3 }[]
}

export const SCENE_TEMPLATES: SceneTemplate[] = [
  {
    id: 'throne_room',
    label: 'Throne Room',
    environmentId: 'dungeon',
    terrainId: 'grid',
    characters: [
      { presetId: 'knight', position: [-2.2, 0, -4] },
      { presetId: 'skeleton', position: [2.2, 0, -4] },
    ],
    props: [
      { presetId: 'pillar', position: [-3.6, 0, -6] },
      { presetId: 'pillar', position: [3.6, 0, -6] },
      { presetId: 'torch', position: [-3.6, 0, -2.5] },
      { presetId: 'torch', position: [3.6, 0, -2.5] },
      { presetId: 'table', position: [0, 0, -6.5] },
      { presetId: 'chair', position: [0, 0, -7.6] },
    ],
    objects: [],
  },
  {
    id: 'forest_ambush',
    label: 'Forest Ambush',
    environmentId: 'forest',
    terrainId: 'hills',
    characters: [
      { presetId: 'rogue', position: [0, 0, -3] },
      { presetId: 'skeleton', position: [-3, 0, -6] },
      { presetId: 'skeleton_minion', position: [3, 0, -6] },
    ],
    props: [
      { presetId: 'barrel', position: [-2, 0, -2] },
      { presetId: 'crates', position: [2.5, 0, -2.5] },
    ],
    objects: [],
  },
  {
    id: 'sunset_duel',
    label: 'Sunset Duel',
    environmentId: 'sunset',
    terrainId: 'dunes',
    characters: [
      { presetId: 'knight', position: [-2.4, 0, -4.5] },
      { presetId: 'barbarian', position: [2.4, 0, -4.5] },
    ],
    props: [{ presetId: 'pillar', position: [0, 0, -8] }],
    objects: [],
  },
  {
    id: 'mage_tower',
    label: 'Mage Tower',
    environmentId: 'night',
    terrainId: 'grid',
    characters: [
      { presetId: 'mage', position: [-1.5, 0, -4] },
      { presetId: 'skeleton_mage', position: [2.5, 0, -5] },
    ],
    props: [
      { presetId: 'candle', position: [-1.5, 0, -2.6] },
      { presetId: 'torch', position: [3.5, 0, -3] },
      { presetId: 'keg', position: [-3.5, 0, -5] },
    ],
    objects: [{ kind: 'sphere', position: [0.5, 1.2, -6] }],
  },
]
