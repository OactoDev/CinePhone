import { OrbitControls, PerspectiveCamera } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import { Quaternion, type PerspectiveCamera as ThreePerspectiveCamera } from 'three'
import { CAMERA } from '../config/studio'
import { readingToQuaternion } from '../motion/orientation'
import { useEditorStore } from '../state/useEditorStore'
import type { MotionState } from '../types/motion'
import { useCameraRecorder } from './useCameraRecorder'

interface MotionCameraProps {
  /** Live motion state written by `useDeviceOrientation`. */
  motionRef: React.RefObject<MotionState>
  /** True once orientation events are flowing — otherwise we show the fallback. */
  motionActive: boolean
}

/**
 * The camera rig.
 *
 *  - Motion active: each frame we slerp toward the target orientation from the
 *    sensor for fluid, damped look-around.
 *  - Otherwise: drei OrbitControls so the scene is usable on desktop.
 *  - During `playback` the recorder hook drives the camera, so live controls are
 *    suspended. Recording happens transparently while live controls stay active.
 *  - FOV is driven by the editor store (camera panel slider).
 */
export function MotionCamera({ motionRef, motionActive }: MotionCameraProps) {
  const cameraRef = useRef<ThreePerspectiveCamera>(null)
  const target = useRef(new Quaternion())
  const cameraMode = useEditorStore((s) => s.cameraMode)
  const fov = useEditorStore((s) => s.fov)

  useCameraRecorder(cameraRef)

  useFrame(() => {
    if (cameraMode === 'playback') return // recorder owns the camera
    if (!motionActive || !cameraRef.current) return
    const { reading, screenOrientation } = motionRef.current
    const next = readingToQuaternion(reading, screenOrientation, target.current)
    if (next) cameraRef.current.quaternion.slerp(next, CAMERA.smoothing)
  })

  const liveControls = !motionActive && cameraMode !== 'playback'

  return (
    <>
      <PerspectiveCamera
        ref={cameraRef}
        makeDefault
        fov={fov}
        // Eye height on the grid for motion look-around; pulled back to a
        // 3/4 angle for the desktop OrbitControls fallback so the sandbox is framed.
        position={motionActive ? CAMERA.position : [5, 3, 5]}
      />
      {liveControls && (
        <OrbitControls
          target={[0, 0.8, -1.5]}
          enablePan={false}
          enableZoom
          enableDamping
          dampingFactor={0.08}
          maxPolarAngle={Math.PI / 2 - 0.02}
        />
      )}
    </>
  )
}
