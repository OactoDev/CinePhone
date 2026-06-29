import {
  Camera,
  Check,
  ChevronDown,
  Circle,
  Clapperboard,
  Download,
  Focus,
  Layers,
  Mic,
  Pencil,
  Play,
  Plus,
  Shapes,
  Sparkles,
  Square,
  Trash2,
  X,
  type LucideIcon,
} from 'lucide-react'

/**
 * App icon set, backed by lucide-react. Stable names + a `size` prop (px) so
 * call sites are unchanged; lucide renders crisp, evenly-weighted strokes that
 * scale exactly to `size`.
 */
interface IconProps {
  size?: number
  strokeWidth?: number
}

const make =
  (Icon: LucideIcon, defSize: number, defStroke = 2) =>
  ({ size = defSize, strokeWidth = defStroke }: IconProps) =>
    <Icon size={size} strokeWidth={strokeWidth} />

// Rail / primary actions.
// Play is a filled triangle (outline reads oversized/uneven next to the others).
export const PlayIcon = ({ size = 19 }: IconProps) => (
  <Play size={size} strokeWidth={0} fill="currentColor" />
)
export const StopIcon = make(Square, 20)
export const CubeIcon = make(Shapes, 22)
export const CameraIcon = make(Camera, 22)
export const ArIcon = make(Focus, 22)
export const ClapperboardIcon = make(Clapperboard, 22)
export const RecordIcon = make(Circle, 18)
export const SparklesIcon = make(Sparkles, 18)

// Secondary / inline.
export const MicIcon = make(Mic, 16)
export const LayersIcon = make(Layers, 17)
export const PlusIcon = make(Plus, 16)
export const PencilIcon = make(Pencil, 15)
export const CheckIcon = make(Check, 16)
export const ChevronIcon = make(ChevronDown, 16)
export const TrashIcon = make(Trash2, 16)
export const CloseIcon = make(X, 18)
export const DownloadIcon = make(Download, 18)
