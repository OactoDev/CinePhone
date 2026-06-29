/**
 * Minimal monochrome inline icons. They inherit color via `currentColor` and
 * size via the `size` prop so they stay crisp and themeable.
 */
interface IconProps {
  size?: number
}

const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
})

export function PlayIcon({ size = 22 }: IconProps) {
  return (
    <svg {...base(size)} fill="currentColor" stroke="none">
      <path d="M8 5.5v13l11-6.5z" />
    </svg>
  )
}

export function StopIcon({ size = 22 }: IconProps) {
  return (
    <svg {...base(size)} fill="currentColor" stroke="none">
      <rect x="6.5" y="6.5" width="11" height="11" rx="2" />
    </svg>
  )
}

export function CubeIcon({ size = 22 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M12 2.8 21 7.5v9L12 21.2 3 16.5v-9z" />
      <path d="M3 7.5 12 12l9-4.5" />
      <path d="M12 12v9.2" />
    </svg>
  )
}

export function CameraIcon({ size = 22 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M4 8.5h3l1.5-2h7L18 8.5h2a1 1 0 0 1 1 1V18a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5a1 1 0 0 1 1-1z" />
      <circle cx="12" cy="13" r="3.2" />
    </svg>
  )
}

export function MicIcon({ size = 16 }: IconProps) {
  return (
    <svg {...base(size)}>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0" />
      <path d="M12 18v3" />
    </svg>
  )
}

export function RecordIcon({ size = 22 }: IconProps) {
  return (
    <svg {...base(size)} fill="currentColor" stroke="none">
      <circle cx="12" cy="12" r="6" />
    </svg>
  )
}

export function TrashIcon({ size = 18 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M4 7h16" />
      <path d="M9 7V5h6v2" />
      <path d="M6 7l1 12h10l1-12" />
    </svg>
  )
}

export function CloseIcon({ size = 18 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  )
}
