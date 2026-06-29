import type { ReactNode } from 'react'
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
 * Reusable half-height sheet that slides up from the bottom. Mounted always so
 * it can animate in/out via the `is-open` class; a tap on the scrim closes it.
 */
export function BottomSheet({ open, title, onClose, children, headerRight }: BottomSheetProps) {
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
        <div className="sheet__body">{children}</div>
      </section>
    </>
  )
}
