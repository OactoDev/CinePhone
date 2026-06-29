import { ContactShadows, Environment } from '@react-three/drei'
import { MotionCamera } from '../camera/MotionCamera'
import { ENVIRONMENT } from '../config/studio'
import { useEditorStore } from '../state/useEditorStore'
import type { MotionState } from '../types/motion'
import { Lighting } from './Lighting'
import { SceneObjects } from './SceneObjects'
import { Terrain } from './Terrain'

interface SceneRootProps {
  motionRef: React.RefObject<MotionState>
  motionActive: boolean
}

/**
 * Composes everything that lives in 3D space: the terrain/grid floor,
 * image-based environment + lighting, soft contact shadows, the user-placed
 * objects, and the motion-driven camera rig.
 */
export function SceneRoot({ motionRef, motionActive }: SceneRootProps) {
  const selectObject = useEditorStore((s) => s.selectObject)

  return (
    // Clicking empty space (a miss on every mesh) clears the selection.
    <group onPointerMissed={() => selectObject(null)}>
      <Environment preset={ENVIRONMENT.preset} environmentIntensity={ENVIRONMENT.environmentIntensity} />
      <Lighting />

      <Terrain />
      <ContactShadows position={[0, 0.01, 0]} opacity={0.5} scale={30} blur={2.4} far={12} />
      <SceneObjects />

      <MotionCamera motionRef={motionRef} motionActive={motionActive} />
    </group>
  )
}
