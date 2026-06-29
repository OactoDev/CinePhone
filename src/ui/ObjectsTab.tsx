import { OBJECT_PALETTE } from '../config/library'
import { useEditorStore } from '../state/useEditorStore'
import { TrashIcon } from './icons'

/** Palette to spawn objects + a compact list of placed objects to remove. */
export function ObjectsTab() {
  const objects = useEditorStore((s) => s.objects)
  const selectedId = useEditorStore((s) => s.selectedId)
  const addObject = useEditorStore((s) => s.addObject)
  const removeObject = useEditorStore((s) => s.removeObject)
  const selectObject = useEditorStore((s) => s.selectObject)
  const clearObjects = useEditorStore((s) => s.clearObjects)

  const labelFor = (kind: string) => OBJECT_PALETTE.find((p) => p.kind === kind)?.label ?? kind

  return (
    <>
      <div className="card-grid">
        {OBJECT_PALETTE.map((item) => (
          <button key={item.kind} type="button" className="card" onClick={() => addObject(item.kind)}>
            <span className="card__swatch" style={{ background: item.color }} />
            <span className="card__label">{item.label}</span>
          </button>
        ))}
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
