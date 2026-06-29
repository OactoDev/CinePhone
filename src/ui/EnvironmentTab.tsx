import { Building2, Castle, Moon, Sunrise, Sunset, Trees, type LucideIcon } from 'lucide-react'
import { ENVIRONMENT_PRESETS } from '../config/environments'
import { selectActiveScene, useEditorStore } from '../state/useEditorStore'

const ENV_ICON: Record<string, LucideIcon> = {
  studio: Building2,
  sunset: Sunset,
  dawn: Sunrise,
  night: Moon,
  forest: Trees,
  dungeon: Castle,
}

/** Grid of environment presets; tap to set the scene's lighting/atmosphere. */
export function EnvironmentTab() {
  const environmentId = useEditorStore((s) => selectActiveScene(s).environmentId)
  const setEnvironment = useEditorStore((s) => s.setEnvironment)

  return (
    <div className="card-grid">
      {ENVIRONMENT_PRESETS.map((env) => {
        const Icon = ENV_ICON[env.id] ?? Building2
        return (
          <button
            key={env.id}
            type="button"
            className={`card ${environmentId === env.id ? 'is-active' : ''}`}
            onClick={() => setEnvironment(env.id)}
          >
            <span className="card__icon" style={{ background: env.background }}>
              <Icon size={22} strokeWidth={1.9} />
            </span>
            <span className="card__label">{env.label}</span>
          </button>
        )
      })}
    </div>
  )
}
