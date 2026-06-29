import { Axe, Bone, Bot, Box, Boxes, Circle, Cone, Cylinder, Donut, PawPrint, Shield, Skull, Sparkles, Spline, Sword, VenetianMask, type LucideIcon } from 'lucide-react'
import { CHARACTER_PRESETS } from '../config/characters'
import { OBJECT_PALETTE } from '../config/library'
import { PROP_PRESETS } from '../config/props'
import type { ObjectKind } from '../types/objects'
import { selectActiveScene, useEditorStore } from '../state/useEditorStore'
import { TrashIcon } from './icons'

/** Icon per character preset. */
const PRESET_ICON: Record<string, LucideIcon> = {
  knight: Shield,
  barbarian: Axe,
  mage: Sparkles,
  rogue: VenetianMask,
  skeleton: Skull,
  skeleton_mage: Skull,
  skeleton_minion: Bone,
  robot: Bot,
  fox: PawPrint,
}
const FALLBACK_ICON = Sword

/** Icon per object kind. */
const OBJECT_ICON: Record<ObjectKind, LucideIcon> = {
  cube: Box,
  sphere: Circle,
  cylinder: Cylinder,
  cone: Cone,
  torus: Donut,
  torusKnot: Spline,
}

/** Palette to spawn objects + a compact list of placed objects to remove. */
export function ObjectsTab() {
  const objects = useEditorStore((s) => selectActiveScene(s).objects)
  const selectedId = useEditorStore((s) => s.selectedId)
  const removeObject = useEditorStore((s) => s.removeObject)
  const selectObject = useEditorStore((s) => s.selectObject)
  const clearObjects = useEditorStore((s) => s.clearObjects)
  const setPlacing = useEditorStore((s) => s.setPlacing)
  const closePanel = useEditorStore((s) => s.closePanel)

  const labelFor = (kind: string) => OBJECT_PALETTE.find((p) => p.kind === kind)?.label ?? kind

  // Arm "tap the ground to place" and reveal the scene by closing the sheet.
  const arm = (placing: Parameters<typeof setPlacing>[0]) => {
    setPlacing(placing)
    closePanel()
  }

  return (
    <>
      <div className="list-head">
        <span className="list-head__title">Characters</span>
      </div>
      <div className="card-grid">
        {CHARACTER_PRESETS.map((preset) => {
          const Icon = PRESET_ICON[preset.id] ?? FALLBACK_ICON
          return (
            <button
              key={preset.id}
              type="button"
              className="card"
              onClick={() => arm({ type: 'character', value: preset.id })}
            >
              <span className="card__icon">
                <Icon size={22} strokeWidth={1.9} />
              </span>
              <span className="card__label">{preset.label}</span>
            </button>
          )
        })}
      </div>

      <div className="list-head">
        <span className="list-head__title">Set pieces</span>
      </div>
      <div className="card-grid">
        {PROP_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            className="card"
            onClick={() => arm({ type: 'prop', value: preset.id })}
          >
            <span className="card__icon">
              <Boxes size={22} strokeWidth={1.9} />
            </span>
            <span className="card__label">{preset.label}</span>
          </button>
        ))}
      </div>

      <div className="list-head">
        <span className="list-head__title">Shapes</span>
      </div>
      <div className="card-grid">
        {OBJECT_PALETTE.map((item) => {
          const Icon = OBJECT_ICON[item.kind] ?? Box
          return (
            <button
              key={item.kind}
              type="button"
              className="card"
              onClick={() => arm({ type: 'object', value: item.kind })}
            >
              <span className="card__icon" style={{ color: item.color }}>
                <Icon size={22} strokeWidth={1.9} />
              </span>
              <span className="card__label">{item.label}</span>
            </button>
          )
        })}
      </div>

      <div className="list-head">
        <span className="list-head__title">In scene · {objects.length}</span>
        {objects.length > 0 && (
          <button type="button" className="text-btn" onClick={clearObjects}>
            Clear all
          </button>
        )}
      </div>

      <ul className="obj-list">
        {objects.length === 0 && <li className="obj-list__empty">Tap an object above to add it.</li>}
        {objects.map((object) => (
          <li
            key={object.id}
            className={`obj-row ${selectedId === object.id ? 'is-selected' : ''}`}
            onClick={() => selectObject(object.id)}
          >
            <span className="obj-row__dot" style={{ background: object.color }} />
            <span className="obj-row__name">{labelFor(object.kind)}</span>
            <button
              type="button"
              className="icon-btn icon-btn--sm"
              aria-label={`Remove ${labelFor(object.kind)}`}
              onClick={(e) => {
                e.stopPropagation()
                removeObject(object.id)
              }}
            >
              <TrashIcon />
            </button>
          </li>
        ))}
      </ul>
    </>
  )
}
