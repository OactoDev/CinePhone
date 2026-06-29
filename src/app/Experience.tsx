import { Canvas } from '@react-three/fiber'
import { ACESFilmicToneMapping } from 'three'
import { SceneCapturer } from '../scene/SceneCapturer'
import { SceneRoot } from '../scene/SceneRoot'
import type { MotionState } from '../types/motion'

interface ExperienceProps {
  motionRef: React.RefObject<MotionState>
  motionActive: boolean
}

/**
 * The R3F entry point: owns the <Canvas>, the cinematic render settings
 * (soft shadows + ACES tone mapping) and the atmosphere (near-white background
 * with matching fog so the grid fades into an infinite horizon).
 */
export function Experience({ motionRef, motionActive }: ExperienceProps) {
  return (
    <Canvas
      shadows="soft"
      dpr={[1, 2]}
      gl={{
        antialias: true,
        toneMapping: ACESFilmicToneMapping,
        toneMappingExposure: 1.05,
        // Needed so we can read pixels back for keyframe capture.
        preserveDrawingBuffer: true,
      }}
    >
      <SceneRoot motionRef={motionRef} motionActive={motionActive} />
      <SceneCapturer />
    </Canvas>
  )
}
