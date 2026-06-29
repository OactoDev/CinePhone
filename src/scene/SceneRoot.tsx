import { ContactShadows, Environment } from '@react-three/drei'
import { MotionCamera } from '../camera/MotionCamera'
import { getEnvironment } from '../config/environments'
import { selectActiveScene, useEditorStore } from '../state/useEditorStore'
import type { MotionState } from '../types/motion'
import { Characters } from './Characters'
import { Lighting } from './Lighting'
import { SceneObjects } from './SceneObjects'
import { SceneProps } from './SceneProps'
import { Terrain } from './Terrain'

interface SceneRootProps {
  motionRef: React.RefObject<MotionState>
  motionActive: boolean
}

/**
 * Composes everything that lives in 3D space. The atmosphere (background, fog,
 * image-based lighting, key lights) comes from the scene's selected environment
 * preset; terrain, props, objects and characters sit on top.
 */
export function SceneRoot({ motionRef, motionActive }: SceneRootProps) {
  const selectObject = useEditorStore((s) => s.selectObject)
  const environmentId = useEditorStore((s) => selectActiveScene(s).environmentId)
  const env = getEnvironment(environmentId)

  return (
    <>
      {/* Must be direct children of the Canvas scene root to attach to the scene. */}
      <color attach="background" args={[env.background]} />
      <fogExp2 attach="fog" args={[env.background, env.fogDensity]} />

      {/* Clicking empty space (a miss on every mesh) clears the selection. */}
      <group onPointerMissed={() => selectObject(null)}>
        <Environment preset={env.envPreset} environmentIntensity={env.environmentIntensity} />
        <Lighting env={env} />

        <Terrain />
        <ContactShadows position={[0, 0.01, 0]} opacity={0.5} scale={30} blur={2.4} far={12} />
        <SceneObjects />
        <SceneProps />
        <Characters />

        <MotionCamera motionRef={motionRef} motionActive={motionActive} />
      </group>
    </>
  )
}
