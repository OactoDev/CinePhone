import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { useRef, useState } from 'react'
import {
  listProjectsCloud,
  loadProjectCloud,
  saveProjectCloud,
  type ProjectSummary,
} from '../cloud/storageClient'
import { getClip } from '../config/clips'
import { SCENE_TEMPLATES } from '../config/templates'
import { loadModelCatalog, syncModelsCloud } from '../cloud/modelCatalog'
import { selectActiveScene, useEditorStore } from '../state/useEditorStore'
import { CheckIcon, ChevronIcon, LayersIcon, PencilIcon, PlusIcon, TrashIcon } from './icons'

interface ProjectHudProps {
  /** Feed a typed director's command into the same parser the voice uses. */
  submitCommand: (text: string) => void
}

/**
 * Top-left HUD: the window into the project source of truth. Shows the project
 * name + active scene as a compact pill; tapping it opens a panel to edit the
 * project name/context, manage scenes, review the active scene's shot list, and
 * type director's commands (the same grammar as voice).
 */
export function ProjectHud({ submitCommand }: ProjectHudProps) {
  const project = useEditorStore((s) => s.project)
  const activeScene = useEditorStore(selectActiveScene)
  const renameProject = useEditorStore((s) => s.renameProject)
  const setDescription = useEditorStore((s) => s.setDescription)
  const addScene = useEditorStore((s) => s.addScene)
  const selectScene = useEditorStore((s) => s.selectScene)
  const renameScene = useEditorStore((s) => s.renameScene)
  const removeScene = useEditorStore((s) => s.removeScene)
  const removeAction = useEditorStore((s) => s.removeAction)
  const performCharacter = useEditorStore((s) => s.performCharacter)
  const loadProjectDocument = useEditorStore((s) => s.loadProjectDocument)
  const addSceneFromTemplate = useEditorStore((s) => s.addSceneFromTemplate)
  const setModelCatalog = useEditorStore((s) => s.setModelCatalog)

  const [open, setOpen] = useState(false)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [command, setCommand] = useState('')
  const [cloud, setCloud] = useState('') // status line
  const [cloudList, setCloudList] = useState<ProjectSummary[] | null>(null)
  const root = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
      if (!open) return
      gsap.from('.hud__panel', { y: -8, opacity: 0, duration: 0.28, ease: 'power2.out' })
      gsap.from('.hud__panel > *', {
        y: 8,
        opacity: 0,
        stagger: 0.04,
        duration: 0.3,
        ease: 'power2.out',
        delay: 0.05,
      })
    },
    { scope: root, dependencies: [open] },
  )

  const runCommand = () => {
    const text = command.trim()
    if (!text) return
    submitCommand(text)
    setCommand('')
  }

  const saveToCloud = async () => {
    setCloud('Saving…')
    try {
      await saveProjectCloud(useEditorStore.getState().project)
      setCloud('Saved to cloud')
    } catch (e) {
      setCloud(e instanceof Error ? e.message : 'Save failed')
    }
  }

  const toggleCloudList = async () => {
    if (cloudList) return setCloudList(null)
    setCloud('Loading…')
    try {
      setCloudList(await listProjectsCloud())
      setCloud('')
    } catch (e) {
      setCloud(e instanceof Error ? e.message : 'Load failed')
    }
  }

  const loadFromCloud = async (id: string) => {
    setCloud('Loading…')
    try {
      const doc = await loadProjectCloud(id)
      if (doc) {
        loadProjectDocument(doc)
        setCloud('Loaded')
        setCloudList(null)
        setOpen(false)
      } else setCloud('Not found')
    } catch (e) {
      setCloud(e instanceof Error ? e.message : 'Load failed')
    }
  }

  return (
    <div className="hud" ref={root}>
      <button
        type="button"
        className={`hud__pill ${open ? 'is-open' : ''}`}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="hud__icon">
          <LayersIcon />
        </span>
        <span className="hud__labels">
          <span className="hud__project">{project.name}</span>
          <span className="hud__scene">{activeScene.name}</span>
        </span>
        <span className={`hud__chevron ${open ? 'is-open' : ''}`}>
          <ChevronIcon />
        </span>
      </button>

      {open && (
        <div className="hud__panel">
          <label className="field">
            <span className="field__label">Project</span>
            <input
              className="field__input"
              value={project.name}
              onChange={(e) => renameProject(e.target.value)}
              placeholder="Project name"
            />
          </label>

          <label className="field">
            <span className="field__label">Context</span>
            <textarea
              className="field__input field__input--area"
              value={project.description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Notes, intent, references…"
              rows={2}
            />
          </label>

          <div className="list-head">
            <span className="list-head__title">Scenes · {project.scenes.length}</span>
            <button type="button" className="text-btn text-btn--icon" onClick={addScene}>
              <PlusIcon size={15} /> New
            </button>
          </div>

          <ul className="scene-list">
            {project.scenes.map((scene) => {
              const isActive = scene.id === project.activeSceneId
              const isRenaming = renamingId === scene.id
              return (
                <li key={scene.id} className={`scene-row ${isActive ? 'is-active' : ''}`}>
                  {isRenaming ? (
                    <input
                      className="field__input field__input--inline"
                      value={scene.name}
                      autoFocus
                      onChange={(e) => renameScene(scene.id, e.target.value)}
                      onBlur={() => setRenamingId(null)}
                      onKeyDown={(e) => e.key === 'Enter' && setRenamingId(null)}
                    />
                  ) : (
                    <button type="button" className="scene-row__name" onClick={() => selectScene(scene.id)}>
                      <span className="scene-row__dot" />
                      {scene.name}
                      <span className="scene-row__meta">{scene.actions.length} act</span>
                    </button>
                  )}

                  <button
                    type="button"
                    className="icon-btn icon-btn--sm"
                    aria-label={isRenaming ? 'Done' : 'Rename scene'}
                    onClick={() => setRenamingId(isRenaming ? null : scene.id)}
                  >
                    {isRenaming ? <CheckIcon /> : <PencilIcon />}
                  </button>
                  <button
                    type="button"
                    className="icon-btn icon-btn--sm"
                    aria-label="Delete scene"
                    disabled={project.scenes.length <= 1}
                    onClick={() => removeScene(scene.id)}
                  >
                    <TrashIcon size={16} />
                  </button>
                </li>
              )
            })}
          </ul>

          <div className="list-head">
            <span className="list-head__title">Start from template</span>
          </div>
          <div className="tpl-grid">
            {SCENE_TEMPLATES.map((t) => (
              <button
                key={t.id}
                type="button"
                className="tpl-btn"
                onClick={() => {
                  addSceneFromTemplate(t.id)
                  setOpen(false)
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="list-head">
            <span className="list-head__title">Shot list · {activeScene.name}</span>
          </div>
          <ul className="action-list">
            {activeScene.actions.length === 0 && (
              <li className="obj-list__empty">Say “create action … end action” to direct a beat.</li>
            )}
            {activeScene.actions.map((action, i) => {
              const clip = action.clipId ? getClip(action.clipId) : null
              return (
                <li key={action.id} className="action-row">
                  <span className="action-row__num">{i + 1}</span>
                  <span className="action-row__desc">
                    {action.description || <em>…</em>}
                  </span>
                  {clip ? (
                    <button
                      type="button"
                      className="clip-badge"
                      title="Replay clip"
                      onClick={() => action.characterId && performCharacter(action.characterId, clip.id)}
                    >
                      {clip.label}
                    </button>
                  ) : (
                    <span className="clip-badge clip-badge--none">—</span>
                  )}
                  <button
                    type="button"
                    className="icon-btn icon-btn--sm"
                    aria-label="Delete action"
                    onClick={() => removeAction(action.id)}
                  >
                    <TrashIcon size={16} />
                  </button>
                </li>
              )
            })}
          </ul>

          <label className="field">
            <span className="field__label">Director’s command</span>
            <div className="command-row">
              <input
                className="field__input"
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && runCommand()}
                placeholder="create action the actor waves end action"
              />
              <button type="button" className="icon-btn" aria-label="Run command" onClick={runCommand}>
                <CheckIcon />
              </button>
            </div>
          </label>

          <div className="list-head">
            <span className="list-head__title">Cloud (Aurora)</span>
            {cloud && <span className="cloud-status">{cloud}</span>}
          </div>
          <div className="cloud-row">
            <button type="button" className="ghost-btn ghost-btn--sm" onClick={saveToCloud}>
              Save
            </button>
            <button type="button" className="ghost-btn ghost-btn--sm" onClick={toggleCloudList}>
              {cloudList ? 'Hide' : 'Load…'}
            </button>
            <button
              type="button"
              className="ghost-btn ghost-btn--sm"
              onClick={async () => {
                setCloud('Uploading models…')
                try {
                  const n = await syncModelsCloud()
                  setModelCatalog(await loadModelCatalog())
                  setCloud(`${n} models in cloud`)
                } catch (e) {
                  setCloud(e instanceof Error ? e.message : 'Sync failed')
                }
              }}
            >
              Sync models
            </button>
          </div>
          {cloudList && (
            <ul className="obj-list">
              {cloudList.length === 0 && <li className="obj-list__empty">No saved projects.</li>}
              {cloudList.map((p) => (
                <li key={p.id} className="obj-row" onClick={() => loadFromCloud(p.id)}>
                  <span className="obj-row__name">{p.name || 'Untitled'}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
