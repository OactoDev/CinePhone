import { useState } from 'react'
import { useChoreographer } from '../choreo/useChoreographer'
import { useDirector } from '../choreo/useDirector'
import { CLIPS } from '../config/clips'
import { selectActiveScene, useEditorStore } from '../state/useEditorStore'
import type { ClipId } from '../types/film'
import { PlayIcon, PlusIcon, TrashIcon } from './icons'

/**
 * The scene's editable shot list. Top: "Direct scene with AI" (synopsis → an
 * ordered list of beats via the Opus director). Below: each beat is editable
 * (title/description/clip), reorderable, re-choreographable, and replayable.
 */
export function ShotList() {
  const scene = useEditorStore(selectActiveScene)
  const setSceneSynopsis = useEditorStore((s) => s.setSceneSynopsis)
  const updateAction = useEditorStore((s) => s.updateAction)
  const reorderAction = useEditorStore((s) => s.reorderAction)
  const removeAction = useEditorStore((s) => s.removeAction)
  const addBeat = useEditorStore((s) => s.addBeat)
  const setActionPlan = useEditorStore((s) => s.setActionPlan)
  const setPlan = useEditorStore((s) => s.setPlan)
  const performCharacter = useEditorStore((s) => s.performCharacter)

  const { directScene, busy, error } = useDirector()
  const choreograph = useChoreographer()
  const [synopsis, setSynopsis] = useState(scene.synopsis ?? '')
  const [rechoreoId, setRechoreoId] = useState<string | null>(null)

  const runDirect = (replace: boolean) => {
    setSceneSynopsis(synopsis)
    void directScene(synopsis, replace)
  }

  const rechoreograph = async (id: string, description: string) => {
    setRechoreoId(id)
    try {
      const plan = await choreograph(description)
      setActionPlan(id, plan)
      setPlan(plan)
    } finally {
      setRechoreoId(null)
    }
  }

  return (
    <>
      <div className="list-head">
        <span className="list-head__title">Direct scene with AI</span>
      </div>
      <textarea
        className="synopsis"
        rows={2}
        value={synopsis}
        onChange={(e) => setSynopsis(e.target.value)}
        onBlur={() => setSceneSynopsis(synopsis)}
        placeholder="Describe the whole scene: e.g. “The knight sneaks up on the skeleton by the barrel, they duel, the knight wins.”"
      />
      <div className="direct-row">
        <button type="button" className="ghost-btn ghost-btn--sm" disabled={busy} onClick={() => runDirect(true)}>
          {busy ? 'Directing…' : 'Direct (replace)'}
        </button>
        <button type="button" className="ghost-btn ghost-btn--sm" disabled={busy} onClick={() => runDirect(false)}>
          Append beats
        </button>
      </div>
      {error && <p className="panel-hint">{error}</p>}

      <div className="list-head">
        <span className="list-head__title">Shot list · {scene.name}</span>
        <button type="button" className="icon-btn icon-btn--sm" aria-label="Add beat" onClick={() => addBeat()}>
          <PlusIcon size={16} />
        </button>
      </div>
      <ul className="action-list">
        {scene.actions.length === 0 && (
          <li className="obj-list__empty">Direct a scene above, say “create action … end action”, or add a beat.</li>
        )}
        {scene.actions.map((action, i) => (
          <li key={action.id} className="beat">
            <div className="beat__head">
              <span className="action-row__num">{i + 1}</span>
              <input
                className="beat__title"
                value={action.title ?? ''}
                placeholder="Beat title"
                onChange={(e) => updateAction(action.id, { title: e.target.value })}
              />
              <div className="beat__reorder">
                <button
                  type="button"
                  className="icon-btn icon-btn--sm"
                  aria-label="Move up"
                  disabled={i === 0}
                  onClick={() => reorderAction(action.id, -1)}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="icon-btn icon-btn--sm"
                  aria-label="Move down"
                  disabled={i === scene.actions.length - 1}
                  onClick={() => reorderAction(action.id, 1)}
                >
                  ↓
                </button>
              </div>
            </div>

            <input
              className="beat__desc"
              value={action.description}
              placeholder="What happens (director's intent)"
              onChange={(e) => updateAction(action.id, { description: e.target.value })}
            />

            <div className="beat__tools">
              <select
                className="beat__clip"
                value={action.clipId ?? ''}
                onChange={(e) => {
                  const clipId = (e.target.value || null) as ClipId | null
                  updateAction(action.id, { clipId })
                  if (clipId && action.characterId) performCharacter(action.characterId, clipId)
                }}
              >
                <option value="">— clip —</option>
                {CLIPS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>

              {action.plan && (
                <button
                  type="button"
                  className="icon-btn icon-btn--sm"
                  aria-label="Replay beat"
                  onClick={() => action.plan && setPlan(action.plan)}
                >
                  <PlayIcon size={14} />
                </button>
              )}
              <button
                type="button"
                className="ghost-btn ghost-btn--xs"
                disabled={rechoreoId === action.id || !action.description}
                onClick={() => rechoreograph(action.id, action.description)}
              >
                {rechoreoId === action.id ? '…' : 'Re-AI'}
              </button>
              <button
                type="button"
                className="icon-btn icon-btn--sm"
                aria-label="Delete beat"
                onClick={() => removeAction(action.id)}
              >
                <TrashIcon size={16} />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </>
  )
}
