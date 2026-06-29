import { Maximize, Move, Rotate3d, Trash2, Wrench } from 'lucide-react'
import { useEditorStore } from '../state/useEditorStore'
import type { TransformMode } from '../state/useEditorStore'

const MODES: { mode: TransformMode; label: string; Icon: typeof Move }[] = [
  { mode: 'translate', label: 'Move', Icon: Move },
  { mode: 'rotate', label: 'Rotate', Icon: Rotate3d },
  { mode: 'scale', label: 'Scale', Icon: Maximize },
]

/**
 * Bottom-left tool cluster: a transform-tool toggle that, when on, reveals
 * Move / Rotate / Scale mode buttons for the selected entity, plus a Delete
 * button. Hidden while AR or the Generate phase is active.
 */
export function SelectionBar() {
  const moveMode = useEditorStore((s) => s.moveMode)
  const setMoveMode = useEditorStore((s) => s.setMoveMode)
  const transformMode = useEditorStore((s) => s.transformMode)
  const setTransformMode = useEditorStore((s) => s.setTransformMode)
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
        aria-label="Transform tool"
        title="Transform tool — move / rotate / scale the selected object"
        onClick={() => setMoveMode(!moveMode)}
      >
        <Wrench size={18} />
      </button>

      {moveMode &&
        MODES.map(({ mode, label, Icon }) => (
          <button
            key={mode}
            type="button"
            className={`seltool ${transformMode === mode ? 'is-active' : ''}`}
            aria-pressed={transformMode === mode}
            aria-label={label}
            title={label}
            onClick={() => setTransformMode(mode)}
          >
            <Icon size={18} />
          </button>
        ))}

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
