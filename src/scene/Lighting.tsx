/**
 * Cinematic key/fill lighting layered on top of the image-based environment.
 * A single soft directional key casts the shadows; ambient + hemisphere lift
 * the shadows so the near-white stage stays bright and clean.
 */
export function Lighting() {
  return (
    <>
      <ambientLight intensity={0.35} />
      <hemisphereLight args={['#ffffff', '#d7dae0', 0.6]} />
      <directionalLight
        castShadow
        position={[8, 12, 6]}
        intensity={1.6}
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0001}
      >
        {/* Tight ortho frustum around the sandbox = crisp soft shadows. */}
        <orthographicCamera attach="shadow-camera" args={[-15, 15, 15, -15, 0.1, 40]} />
      </directionalLight>
    </>
  )
}
