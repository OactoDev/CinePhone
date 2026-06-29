import { TransformControls } from '@react-three/drei'
import { useRef, type ReactNode } from 'react'
import { Group } from 'three'
import { useEditorStore } from '../state/useEditorStore'
import type { Vec3 } from '../types/scene'

/**
 * Wraps an entity's content with: tap-to-select, and — when it's selected and
 * the move tool is on — a transform gizmo (drei TransformControls) in the active
 * mode (translate on the ground / rotate yaw / uniform scale). On release the
 * new transform is persisted. The group owns position + rotation + scale for
 * every entity type so the gizmo edits and persistence stay uniform.
 */
export function Movable({
  id,
  position,
  rotation = [0, 0, 0],
  scale = 1,
  children,
}: {
  id: string
  position: Vec3
  rotation?: Vec3
  scale?: number
  children: ReactNode
}) {
  const selected = useEditorStore((s) => s.selectedId === id)
  const moveMode = useEditorStore((s) => s.moveMode)
  const mode = useEditorStore((s) => s.transformMode)
  const select = useEditorStore((s) => s.selectObject)
  const transformEntity = useEditorStore((s) => s.transformEntity)
  const ref = useRef<Group>(null)

  const node = (
    <group
      ref={ref}
      position={position}
      rotation={rotation}
      scale={scale}
      onClick={(e) => {
        e.stopPropagation()
        select(id)
      }}
    >
      {children}
    </group>
  )

  if (!(selected && moveMode)) return node

  const commit = () => {
    const g = ref.current
    if (!g) return
    if (mode === 'translate') {
      transformEntity(id, { position: [g.position.x, g.position.y, g.position.z] })
    } else if (mode === 'rotate') {
      transformEntity(id, { rotation: [g.rotation.x, g.rotation.y, g.rotation.z] })
    } else {
      // Uniform scale (read one axis); re-applied uniformly on the next render.
      transformEntity(id, { scale: Math.max(0.05, g.scale.x) })
    }
  }

  return (
    <TransformControls
      mode={mode}
      // Translate on the ground plane; rotate yaw only; scale uniform.
      showY={mode !== 'translate'}
      showX={mode !== 'rotate'}
      showZ={mode !== 'rotate'}
      translationSnap={0.25}
      rotationSnap={Math.PI / 24}
      onMouseUp={commit}
    >
      {node}
    </TransformControls>
  )
}
