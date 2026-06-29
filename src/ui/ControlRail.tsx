import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { useRef } from 'react'
import { useEditorStore } from '../state/useEditorStore'
import { ArIcon, CameraIcon, ClapperboardIcon, CubeIcon, PlayIcon, StopIcon } from './icons'

/**
 * The right-side vertical pill rail (matches the reference screenshot):
 * Play/Stop preview, Library (cube), Camera. Only one panel is open at a time;
 * tapping an active button closes its panel.
 */
export function ControlRail() {
  const panel = useEditorStore((s) => s.panel)
  const arActive = useEditorStore((s) => s.arActive)
  const openPanel = useEditorStore((s) => s.openPanel)
  const closePanel = useEditorStore((s) => s.closePanel)
  const toggleAr = useEditorStore((s) => s.toggleAr)
  const openGeneration = useEditorStore((s) => s.openGeneration)
  const root = useRef<HTMLElement>(null)

  const toggle = (target: 'library' | 'camera' | 'preview') =>
    panel === target ? closePanel() : openPanel(target)

  // Staggered entrance for the rail buttons.
  useGSAP(
    () => {
      gsap.from('.rail__btn', {
        scale: 0.4,
        opacity: 0,
        stagger: 0.06,
        duration: 0.45,
        ease: 'back.out(1.7)',
      })
    },
    { scope: root },
  )

  return (
    <nav className="rail" aria-label="Scene controls" ref={root}>
      <button
        type="button"
        className={`rail__btn ${panel === 'preview' ? 'is-active' : ''}`}
        aria-label="Preview scene"
        aria-pressed={panel === 'preview'}
        onClick={() => toggle('preview')}
      >
        {panel === 'preview' ? <StopIcon size={20} /> : <PlayIcon size={20} />}
      </button>

      <button
        type="button"
        className={`rail__btn ${panel === 'library' ? 'is-active' : ''}`}
        aria-label="Terrain & objects library"
        aria-pressed={panel === 'library'}
        onClick={() => toggle('library')}
      >
        <CubeIcon size={23} />
      </button>

      <button
        type="button"
        className={`rail__btn ${panel === 'camera' ? 'is-active' : ''}`}
        aria-label="Camera mode"
        aria-pressed={panel === 'camera'}
        onClick={() => toggle('camera')}
      >
        <CameraIcon size={23} />
      </button>

      <button
        type="button"
        className={`rail__btn ${arActive ? 'is-active' : ''}`}
        aria-label={arActive ? 'Exit AR' : 'Enter AR (walk through)'}
        aria-pressed={arActive}
        onClick={toggleAr}
      >
        <ArIcon size={23} />
      </button>

      <button
        type="button"
        className="rail__btn rail__btn--cta"
        aria-label="Generate Movie"
        onClick={openGeneration}
      >
        <ClapperboardIcon size={22} />
      </button>
    </nav>
  )
}
