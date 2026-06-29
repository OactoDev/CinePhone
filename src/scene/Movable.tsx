import { TransformControls } from '@react-three/drei'
import { useRef, type ReactNode } from 'react'
import { Group } from 'three'
import { useEditorStore } from '../state/useEditorStore'
import type { Vec3 } from '../types/scene'

/**
 * Wraps an entity's content with: tap-to-select, and — when it's selected and
 * the move tool is on — a ground-plane translate gizmo (drei TransformControls,
 * Y locked). On release the new position is persisted to the store. The caller
 * passes the resting position (already ground-snapped for characters/props).
 */
export function Movable({
  id,
  position,
  children,
}: {
  id: string
  position: Vec3
  children: ReactNode
}) {
  const selected = useEditorStore((s) => s.selectedId === id)
  const moveMode = useEditorStore((s) => s.moveMode)
  const select = useEditorStore((s) => s.selectObject)
  const moveEntity = useEditorStore((s) => s.moveEntity)
  const ref = useRef<Group>(null)

  const node = (
    <group
      ref={ref}
      position={position}
      onClick={(e) => {
        e.stopPropagation()
        select(id)
      }}
    >
      {children}
    </group>
  )

  if (!(selected && moveMode)) return node

  return (
    <TransformControls
      mode="translate"
      showY={false}
      translationSnap={0.25}
      onMouseUp={() => {
        const g = ref.current
        if (g) moveEntity(id, [g.position.x, g.position.y, g.position.z])
      }}
    >
      {node}
    </TransformControls>
  )
}
