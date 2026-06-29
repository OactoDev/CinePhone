import type { EnvironmentPreset } from '../config/environments'

/**
 * Key/fill lighting layered on top of the image-based environment, driven by
 * the selected environment preset so each mood (studio, sunset, night, dungeon…)
 * has its own colour and intensity. The directional key casts the shadows.
 */
export function Lighting({ env }: { env: EnvironmentPreset }) {
  return (
    <>
      <ambientLight intensity={env.ambient} />
      <hemisphereLight args={[env.hemiSky, env.hemiGround, env.hemiIntensity]} />
      <directionalLight
        castShadow
        position={env.dirPosition}
        color={env.dirColor}
        intensity={env.dirIntensity}
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0001}
      >
        <orthographicCamera attach="shadow-camera" args={[-15, 15, 15, -15, 0.1, 40]} />
      </directionalLight>
    </>
  )
}
