import { Grid3x3, Mountain, MountainSnow, Waves, type LucideIcon } from 'lucide-react'
import { TERRAIN_PRESETS } from '../config/library'
import { selectActiveScene, useEditorStore } from '../state/useEditorStore'

/** Icon per terrain preset (falls back to a grid). */
const TERRAIN_ICON: Record<string, LucideIcon> = {
  grid: Grid3x3,
  hills: Mountain,
  mountains: MountainSnow,
  dunes: Waves,
}

/** Grid of terrain preset cards; tap to apply to the scene ground. */
export function TerrainTab() {
  const terrainId = useEditorStore((s) => selectActiveScene(s).terrainId)
  const setTerrain = useEditorStore((s) => s.setTerrain)

  return (
    <div className="card-grid">
      {TERRAIN_PRESETS.map((preset) => {
        const Icon = TERRAIN_ICON[preset.id] ?? Grid3x3
        return (
          <button
            key={preset.id}
            type="button"
            className={`card ${terrainId === preset.id ? 'is-active' : ''}`}
            onClick={() => setTerrain(preset.id)}
          >
            <span className="card__icon">
              <Icon size={22} strokeWidth={1.9} />
            </span>
            <span className="card__label">{preset.label}</span>
          </button>
        )
      })}
    </div>
  )
}
