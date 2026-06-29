/**
 * Bundled GLB set-piece props (KayKit Dungeon Remastered — CC0). Static meshes
 * placed in the scene as decoration. Self-contained `.glb` binaries in
 * public/models/props/.
 *
 * (KayKit City-Builder ships only FBX + multi-file glTF — not self-contained
 * `.glb` — so it isn't wired here; convert to GLB to add city pieces.)
 */
export interface PropPreset {
  id: string
  label: string
  modelUrl: string
  /** Uniform scale applied to the model (KayKit dungeon ≈ 1 unit grid). */
  scale: number
}

export const PROP_PRESETS: PropPreset[] = [
  { id: 'barrel', label: 'Barrel', modelUrl: '/models/props/barrel.glb', scale: 1 },
  { id: 'crates', label: 'Crates', modelUrl: '/models/props/crates.glb', scale: 1 },
  { id: 'table', label: 'Table', modelUrl: '/models/props/table.glb', scale: 1 },
  { id: 'chair', label: 'Chair', modelUrl: '/models/props/chair.glb', scale: 1 },
  { id: 'pillar', label: 'Pillar', modelUrl: '/models/props/pillar.glb', scale: 1 },
  { id: 'torch', label: 'Torch', modelUrl: '/models/props/torch.glb', scale: 1 },
  { id: 'keg', label: 'Keg', modelUrl: '/models/props/keg.glb', scale: 1 },
  { id: 'candle', label: 'Candles', modelUrl: '/models/props/candle.glb', scale: 1 },
]

export const getProp = (id: string): PropPreset | undefined =>
  PROP_PRESETS.find((p) => p.id === id)
