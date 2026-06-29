import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { useRef, type ReactNode } from 'react'
import { CloseIcon } from './icons'

interface BottomSheetProps {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  /** Right-aligned header content (e.g. tab switcher). */
  headerRight?: ReactNode
}

/**
 * Reusable half-height sheet that slides up from the bottom (CSS transform). On
 * open, GSAP reveals the body content with a subtle upward stagger so it feels
 * alive rather than just sliding in.
 */
export function BottomSheet({ open, title, onClose, children, headerRight }: BottomSheetProps) {
  const body = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
      if (!open || !body.current) return
      gsap.from(body.current.children, {
        y: 14,
        opacity: 0,
        stagger: 0.04,
        duration: 0.35,
        ease: 'power2.out',
        delay: 0.12, // after the sheet has slid up
      })
    },
    { dependencies: [open] },
  )

  return (
    <>
      <div className={`scrim ${open ? 'is-open' : ''}`} onClick={onClose} aria-hidden={!open} />
      <section
        className={`sheet ${open ? 'is-open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        aria-hidden={!open}
      >
        <div className="sheet__handle" />
        <header className="sheet__head">
          <h2 className="sheet__title">{title}</h2>
          <div className="sheet__head-right">
            {headerRight}
            <button type="button" className="icon-btn" aria-label="Close" onClick={onClose}>
              <CloseIcon />
            </button>
          </div>
        </header>
        <div className="sheet__body" ref={body}>
          {children}
        </div>
      </section>
    </>
  )
}
