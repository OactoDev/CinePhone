import { Canvas } from '@react-three/fiber'
import { ACESFilmicToneMapping } from 'three'
import { ENVIRONMENT } from '../config/studio'
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
      gl={{ antialias: true, toneMapping: ACESFilmicToneMapping, toneMappingExposure: 1.05 }}
    >
      <color attach="background" args={[ENVIRONMENT.background]} />
      <fogExp2 attach="fog" args={[ENVIRONMENT.background, ENVIRONMENT.fogDensity]} />
      <SceneRoot motionRef={motionRef} motionActive={motionActive} />
    </Canvas>
  )
}
