import { TERRAIN_PRESETS } from '../config/library'
import { useEditorStore } from '../state/useEditorStore'

/** Grid of terrain preset cards; tap to apply to the scene ground. */
export function TerrainTab() {
  const terrainId = useEditorStore((s) => s.terrainId)
  const setTerrain = useEditorStore((s) => s.setTerrain)

  return (
    <div className="card-grid">
      {TERRAIN_PRESETS.map((preset) => (
        <button
          key={preset.id}
          type="button"
          className={`card ${terrainId === preset.id ? 'is-active' : ''}`}
          onClick={() => setTerrain(preset.id)}
        >
          <span className="card__swatch" style={{ background: preset.color }} />
          <span className="card__label">{preset.label}</span>
        </button>
      ))}
    </div>
  )
}
