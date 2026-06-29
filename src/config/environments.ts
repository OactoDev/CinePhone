/**
 * Environment presets — each is a complete lighting + atmosphere mood
 * (image-based lighting, background, fog, key/fill lights). Selected per scene;
 * the scene's terrain (ground shape) is chosen separately.
 */
export type EnvPresetName =
  | 'city'
  | 'sunset'
  | 'dawn'
  | 'night'
  | 'forest'
  | 'warehouse'
  | 'apartment'
  | 'park'
  | 'lobby'
  | 'studio'

export interface EnvironmentPreset {
  id: string
  label: string
  /** drei <Environment> preset (image-based lighting + reflections). */
  envPreset: EnvPresetName
  /** Background + fog colour. */
  background: string
  fogDensity: number
  environmentIntensity: number
  ambient: number
  hemiSky: string
  hemiGround: string
  hemiIntensity: number
  /** Key directional light. */
  dirColor: string
  dirIntensity: number
  dirPosition: [number, number, number]
}

export const ENVIRONMENT_PRESETS: EnvironmentPreset[] = [
  {
    id: 'studio',
    label: 'Studio',
    envPreset: 'city',
    background: '#f3f4f7',
    fogDensity: 0.012,
    environmentIntensity: 0.85,
    ambient: 0.35,
    hemiSky: '#ffffff',
    hemiGround: '#d7dae0',
    hemiIntensity: 0.6,
    dirColor: '#ffffff',
    dirIntensity: 1.6,
    dirPosition: [8, 12, 6],
  },
  {
    id: 'sunset',
    label: 'Sunset',
    envPreset: 'sunset',
    background: '#f4d6bd',
    fogDensity: 0.018,
    environmentIntensity: 1.0,
    ambient: 0.3,
    hemiSky: '#ffd9a0',
    hemiGround: '#5a3b2e',
    hemiIntensity: 0.5,
    dirColor: '#ff9d5c',
    dirIntensity: 1.5,
    dirPosition: [6, 5, 4],
  },
  {
    id: 'dawn',
    label: 'Dawn',
    envPreset: 'dawn',
    background: '#dfe4ef',
    fogDensity: 0.016,
    environmentIntensity: 0.9,
    ambient: 0.4,
    hemiSky: '#cfe0ff',
    hemiGround: '#b9a98f',
    hemiIntensity: 0.6,
    dirColor: '#ffe3c2',
    dirIntensity: 1.2,
    dirPosition: [5, 7, 6],
  },
  {
    id: 'night',
    label: 'Night',
    envPreset: 'night',
    background: '#0e1118',
    fogDensity: 0.03,
    environmentIntensity: 0.5,
    ambient: 0.18,
    hemiSky: '#2a3a5a',
    hemiGround: '#05070c',
    hemiIntensity: 0.35,
    dirColor: '#9fb6ff',
    dirIntensity: 0.7,
    dirPosition: [-6, 9, -3],
  },
  {
    id: 'forest',
    label: 'Forest',
    envPreset: 'forest',
    background: '#cdd6c5',
    fogDensity: 0.022,
    environmentIntensity: 0.8,
    ambient: 0.35,
    hemiSky: '#dfeccb',
    hemiGround: '#33402a',
    hemiIntensity: 0.6,
    dirColor: '#eaf2c8',
    dirIntensity: 1.1,
    dirPosition: [4, 10, 5],
  },
  {
    id: 'dungeon',
    label: 'Dungeon',
    envPreset: 'warehouse',
    background: '#15110d',
    fogDensity: 0.05,
    environmentIntensity: 0.45,
    ambient: 0.2,
    hemiSky: '#5a4326',
    hemiGround: '#0a0805',
    hemiIntensity: 0.3,
    dirColor: '#ffb066',
    dirIntensity: 0.9,
    dirPosition: [2, 6, 3],
  },
]

export const DEFAULT_ENVIRONMENT_ID = 'studio'

export const getEnvironment = (id?: string): EnvironmentPreset =>
  ENVIRONMENT_PRESETS.find((e) => e.id === id) ?? ENVIRONMENT_PRESETS[0]
