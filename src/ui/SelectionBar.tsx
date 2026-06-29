import { Move3d, Trash2 } from 'lucide-react'
import { useEditorStore } from '../state/useEditorStore'

/**
 * Bottom-left tool cluster: a Move-tool toggle (shows a drag gizmo on the
 * selected entity) and a Delete button when something is selected. Hidden while
 * AR or the Generate phase is active.
 */
export function SelectionBar() {
  const moveMode = useEditorStore((s) => s.moveMode)
  const setMoveMode = useEditorStore((s) => s.setMoveMode)
  const selectedId = useEditorStore((s) => s.selectedId)
  const removeSelected = useEditorStore((s) => s.removeSelected)
  const hidden = useEditorStore((s) => s.arActive || s.genOpen)

  if (hidden) return null

  return (
    <div className="seltools">
      <button
        type="button"
        className={`seltool ${moveMode ? 'is-active' : ''}`}
        aria-pressed={moveMode}
        aria-label="Move tool"
        title="Move tool — drag the selected object"
        onClick={() => setMoveMode(!moveMode)}
      >
        <Move3d size={18} />
      </button>
      {selectedId && (
        <button
          type="button"
          className="seltool seltool--danger"
          aria-label="Delete selected"
          title="Delete selected"
          onClick={removeSelected}
        >
          <Trash2 size={18} />
        </button>
      )}
    </div>
  )
}
