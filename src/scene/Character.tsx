import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import { Group } from 'three'
import { getClip } from '../config/clips'
import { useCharacterRuntime } from '../choreo/useCharacterRuntime'
import type { Character as CharacterModel, ClipId } from '../types/film'

/**
 * A blocky procedural performer — the fallback for characters without a GLB
 * preset. The shared runtime moves/rotates the `rig` group and chooses the
 * clip; here each clip is synthesised by posing limb groups over time.
 */
export function Character({ character }: { character: CharacterModel }) {
  const rig = useRef<Group>(null) // local move/rotate group, driven by the runtime
  const body = useRef<Group>(null)
  const armL = useRef<Group>(null)
  const armR = useRef<Group>(null)
  const legL = useRef<Group>(null)
  const legR = useRef<Group>(null)

  const clip = useCharacterRuntime(character, rig)
  const startT = useRef(0)
  const lastClip = useRef(clip)

  useFrame((state) => {
    if (!rig.current || !body.current) return
    const t = state.clock.elapsedTime
    if (clip !== lastClip.current) {
      lastClip.current = clip
      startT.current = t
    }
    const local = t - startT.current

    // Reset limb pose each frame (the rig group's transform is owned by the runtime).
    body.current.position.y = 0
    body.current.rotation.set(0, 0, 0)
    armL.current?.rotation.set(0, 0, 0)
    armR.current?.rotation.set(0, 0, 0)
    legL.current?.rotation.set(0, 0, 0)
    legR.current?.rotation.set(0, 0, 0)

    pose(clip, { t, local, def: getClip(clip) }, { body, armL, armR, legL, legR })
  })

  return (
    // Positioned by <Movable>; the runtime translates the inner rig locally.
    <group ref={rig}>
      <group ref={legL} position={[-0.16, 0.85, 0]}>
        <mesh position={[0, -0.42, 0]} castShadow>
          <boxGeometry args={[0.22, 0.85, 0.22]} />
          <meshStandardMaterial color="#2b2f38" roughness={0.7} />
        </mesh>
      </group>
      <group ref={legR} position={[0.16, 0.85, 0]}>
        <mesh position={[0, -0.42, 0]} castShadow>
          <boxGeometry args={[0.22, 0.85, 0.22]} />
          <meshStandardMaterial color="#2b2f38" roughness={0.7} />
        </mesh>
      </group>

      <group ref={body}>
        <mesh position={[0, 1.16, 0]} castShadow>
          <boxGeometry args={[0.5, 0.64, 0.28]} />
          <meshStandardMaterial color={character.color} roughness={0.5} metalness={0.1} />
        </mesh>

        <group ref={armL} position={[-0.32, 1.4, 0]}>
          <mesh position={[0, -0.3, 0]} castShadow>
            <boxGeometry args={[0.15, 0.6, 0.15]} />
            <meshStandardMaterial color={character.color} roughness={0.5} metalness={0.1} />
          </mesh>
        </group>
        <group ref={armR} position={[0.32, 1.4, 0]}>
          <mesh position={[0, -0.3, 0]} castShadow>
            <boxGeometry args={[0.15, 0.6, 0.15]} />
            <meshStandardMaterial color={character.color} roughness={0.5} metalness={0.1} />
          </mesh>
        </group>

        <mesh position={[0, 1.68, 0]} castShadow>
          <sphereGeometry args={[0.18, 32, 32]} />
          <meshStandardMaterial color="#e8c8a0" roughness={0.6} />
        </mesh>
      </group>
    </group>
  )
}

interface Refs {
  body: React.RefObject<Group | null>
  armL: React.RefObject<Group | null>
  armR: React.RefObject<Group | null>
  legL: React.RefObject<Group | null>
  legR: React.RefObject<Group | null>
}

/** Apply a clip's pose for this frame. `t` is global time, `local` since start. */
function pose(
  clip: ClipId,
  { t, local, def }: { t: number; local: number; def: { duration: number } },
  r: Refs,
) {
  const { body, armL, armR, legL, legR } = r
  switch (clip) {
    case 'walk': {
      const s = Math.sin(t * 7)
      if (legL.current) legL.current.rotation.x = s * 0.6
      if (legR.current) legR.current.rotation.x = -s * 0.6
      if (armL.current) armL.current.rotation.x = -s * 0.5
      if (armR.current) armR.current.rotation.x = s * 0.5
      if (body.current) {
        body.current.position.y = Math.abs(Math.cos(t * 7)) * 0.05
        body.current.rotation.x = 0.06
      }
      break
    }
    case 'run': {
      const s = Math.sin(t * 11)
      if (legL.current) legL.current.rotation.x = s * 0.9
      if (legR.current) legR.current.rotation.x = -s * 0.9
      if (armL.current) armL.current.rotation.x = -s * 0.8
      if (armR.current) armR.current.rotation.x = s * 0.8
      if (body.current) {
        body.current.position.y = Math.abs(Math.cos(t * 11)) * 0.08
        body.current.rotation.x = 0.18
      }
      break
    }
    case 'jump': {
      const p = Math.min(local / (def.duration || 1), 1)
      const h = Math.sin(p * Math.PI)
      if (body.current) body.current.position.y = h * 0.5
      const tuck = -h * 0.7
      if (legL.current) legL.current.rotation.x = tuck
      if (legR.current) legR.current.rotation.x = tuck
      if (armL.current) armL.current.rotation.x = -h * 1.4
      if (armR.current) armR.current.rotation.x = -h * 1.4
      break
    }
    case 'wave': {
      if (armR.current) {
        armR.current.rotation.z = -2.1
        armR.current.rotation.x = Math.sin(local * 11) * 0.25
      }
      if (body.current) body.current.position.y = Math.sin(t * 1.8) * 0.02
      break
    }
    case 'attack': {
      // alternating punches
      const s = Math.sin(t * 9)
      if (armR.current) armR.current.rotation.x = -1.6 + s * 0.6
      if (armL.current) armL.current.rotation.x = -1.6 - s * 0.6
      if (body.current) body.current.rotation.x = 0.12
      break
    }
    case 'spin': {
      if (body.current) body.current.rotation.y = (t * 4) % (Math.PI * 2)
      break
    }
    case 'sit': {
      if (legL.current) legL.current.rotation.x = -1.4
      if (legR.current) legR.current.rotation.x = -1.4
      if (body.current) body.current.position.y = -0.3
      break
    }
    case 'die': {
      const p = Math.min(local / 1.2, 1)
      if (body.current) body.current.rotation.x = p * (Math.PI / 2 - 0.1)
      break
    }
    case 'dance': {
      if (body.current) {
        body.current.position.y = Math.abs(Math.sin(t * 4)) * 0.09
        body.current.rotation.z = Math.sin(t * 3) * 0.12
        body.current.rotation.y = Math.sin(t * 1.5) * 0.4
      }
      if (armL.current) armL.current.rotation.z = 0.7 + Math.sin(t * 6) * 0.4
      if (armR.current) armR.current.rotation.z = -0.7 - Math.sin(t * 6) * 0.4
      break
    }
    default: {
      // idle: gentle breathing + arm sway
      if (body.current) body.current.position.y = Math.sin(t * 1.8) * 0.02
      if (armL.current) armL.current.rotation.x = Math.sin(t * 1.6) * 0.06
      if (armR.current) armR.current.rotation.x = -Math.sin(t * 1.6) * 0.06
    }
  }
}
