import { useRef, useState } from 'react'
import { getClip } from '../config/clips'
import { selectActiveScene, useEditorStore } from '../state/useEditorStore'
import type { AnimationPlan } from '../types/film'
import { BottomSheet } from './BottomSheet'
import { PlayIcon, StopIcon } from './icons'

/** Total wall-clock of a plan = max over characters of their summed step times. */
function planDuration(plan: AnimationPlan): number {
  const perChar: Record<string, number> = {}
  for (const s of plan.steps) perChar[s.characterId] = (perChar[s.characterId] ?? 0) + s.durationSec
  return Math.max(1, ...Object.values(perChar))
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/**
 * Timeline preview: replays the active scene's directed actions in order,
 * re-applying each stored plan and animating a progress bar across the beats.
 * (Open from the rail Play button.)
 */
export function PreviewPanel() {
  const open = useEditorStore((s) => s.panel === 'preview')
  const closePanel = useEditorStore((s) => s.closePanel)
  const scene = useEditorStore(selectActiveScene)
  const setPlan = useEditorStore((s) => s.setPlan)
  const recording = scene.recording
  const playRecording = useEditorStore((s) => s.playRecording)
  const stopPlayback = useEditorStore((s) => s.stopPlayback)

  const beats = scene.actions.filter((a) => a.plan && a.plan.steps.length > 0)
  const [playing, setPlaying] = useState(false)
  const [index, setIndex] = useState(-1)
  const stop = useRef(false)

  const total = beats.reduce((sum, a) => sum + planDuration(a.plan!), 0)

  const run = async () => {
    if (playing || beats.length === 0) return
    stop.current = false
    setPlaying(true)
    if (recording) playRecording()
    for (let i = 0; i < beats.length; i++) {
      if (stop.current) break
      setIndex(i)
      const plan = beats[i].plan!
      setPlan(plan)
      await sleep(planDuration(plan) * 1000)
    }
    setIndex(-1)
    setPlaying(false)
    if (recording) stopPlayback()
  }

  const halt = () => {
    stop.current = true
    setPlaying(false)
    setIndex(-1)
    if (recording) stopPlayback()
  }

  return (
    <BottomSheet open={open} title="Preview" onClose={closePanel}>
      {beats.length === 0 ? (
        <p className="panel-hint">
          No directed beats yet. Spawn a character and say (or type) “create action … end action”,
          e.g. <em>the knight attacks the skeleton</em>.
        </p>
      ) : (
        <>
          <p className="panel-hint">
            {beats.length} beat{beats.length > 1 ? 's' : ''} · {total.toFixed(0)}s
          </p>
          <div className="pv-track">
            {beats.map((a, i) => (
              <div
                key={a.id}
                className={`pv-seg ${i === index ? 'is-active' : ''} ${index > i ? 'is-done' : ''}`}
                style={{ flexGrow: planDuration(a.plan!) }}
                title={a.description}
              >
                <span className="pv-seg__label">
                  {a.title || (a.clipId ? getClip(a.clipId).label : `Beat ${i + 1}`)}
                </span>
                {i === index && (
                  <span
                    className="pv-seg__fill"
                    style={{ animationDuration: `${planDuration(a.plan!)}s` }}
                  />
                )}
              </div>
            ))}
          </div>
        </>
      )}

      <div className="cam-actions">
        <button
          type="button"
          className="pill-btn pill-btn--cta"
          onClick={playing ? halt : run}
          disabled={beats.length === 0}
        >
          {playing ? <StopIcon size={18} /> : <PlayIcon size={18} />}
          <span>{playing ? 'Stop' : 'Play scene'}</span>
        </button>
      </div>
    </BottomSheet>
  )
}
