import { useFrame } from '@react-three/fiber'
import { useRef, useState } from 'react'
import { Group, Vector3 } from 'three'
import { selectActiveScene, useEditorStore } from '../state/useEditorStore'
import type { Character, ClipId } from '../types/film'

/**
 * Executes a character's choreographed step queue (from the store controller)
 * and returns the canonical clip that should currently play. Mutates `rigRef`
 * (a group in the character's *local* space) for locomotion + facing, so the
 * outer group can keep the static base `position` prop without fighting it.
 *
 * Shared by the GLB and procedural characters — the renderer just maps the
 * returned ClipId to its own animation.
 */
export function useCharacterRuntime(character: Character, rigRef: React.RefObject<Group | null>): ClipId {
  const controller = useEditorStore((s) => s.controllers[character.id])
  const [clip, setClip] = useState<ClipId>('idle')
  const clipRef = useRef<ClipId>('idle')

  const st = useRef({
    rev: -1,
    index: 0,
    start: 0,
    speed: 1,
    targetLocal: null as Vector3 | null,
    obstacles: [] as { x: number; z: number; r: number }[],
  })
  const MY_RADIUS = 0.5

  const setClipOnce = (next: ClipId) => {
    if (clipRef.current !== next) {
      clipRef.current = next
      setClip(next)
    }
  }

  /** World position of a target entity (character/object/prop). */
  const targetWorld = (targetId?: string): [number, number] | null => {
    if (!targetId) return null
    const scene = selectActiveScene(useEditorStore.getState())
    const ent =
      scene.characters.find((c) => c.id === targetId) ??
      scene.objects.find((o) => o.id === targetId) ??
      scene.props.find((p) => p.id === targetId)
    return ent ? [ent.position[0], ent.position[2]] : null
  }

  /** Static obstacles (all entities except self and the move target). */
  const obstaclesExcept = (excludeId?: string) => {
    const scene = selectActiveScene(useEditorStore.getState())
    const list: { x: number; z: number; r: number }[] = []
    for (const c of scene.characters)
      if (c.id !== character.id && c.id !== excludeId) list.push({ x: c.position[0], z: c.position[2], r: 0.5 })
    for (const o of scene.objects)
      if (o.id !== excludeId) list.push({ x: o.position[0], z: o.position[2], r: 0.7 * o.scale })
    for (const p of scene.props)
      if (p.id !== excludeId) list.push({ x: p.position[0], z: p.position[2], r: 0.7 * p.scale })
    return list
  }

  const beginStep = (i: number, t: number, rig: Group) => {
    st.current.index = i
    st.current.start = t
    const step = controller?.steps[i]
    if (!step) return
    if (step.action === 'move' || step.action === 'face') {
      // Destination: explicit `to` world coords, else a target entity.
      const world = step.to ?? targetWorld(step.targetId)
      st.current.targetLocal = world
        ? new Vector3(world[0] - character.position[0], 0, world[1] - character.position[2])
        : null
      st.current.obstacles = step.action === 'move' ? obstaclesExcept(step.targetId) : []
      if (st.current.targetLocal && step.action === 'move') {
        const tl = st.current.targetLocal
        const dist = Math.hypot(tl.x - rig.position.x, tl.z - rig.position.z)
        const stop = step.distance ?? 1
        st.current.speed = Math.max(0.6, (dist - stop) / Math.max(0.3, step.durationSec))
      }
    }
  }

  useFrame((state, dt) => {
    const rig = rigRef.current
    if (!rig) return
    const ctrl = controller
    if (!ctrl || ctrl.steps.length === 0) {
      setClipOnce('idle')
      return
    }
    const t = state.clock.elapsedTime
    if (st.current.rev !== ctrl.rev) {
      st.current.rev = ctrl.rev
      beginStep(0, t, rig)
    }

    const step = ctrl.steps[st.current.index]
    if (!step) {
      setClipOnce('idle')
      return
    }
    const elapsed = t - st.current.start
    let done = false

    switch (step.action) {
      case 'wait':
        setClipOnce('idle')
        done = elapsed >= step.durationSec
        break
      case 'play':
        setClipOnce(step.clip ?? 'idle')
        done = elapsed >= step.durationSec
        break
      case 'face': {
        setClipOnce('idle')
        const tl = st.current.targetLocal
        if (tl) {
          const ang = Math.atan2(tl.x - rig.position.x, tl.z - rig.position.z)
          rig.rotation.y = lerpAngle(rig.rotation.y, ang, 1 - Math.exp(-8 * dt))
        }
        done = elapsed >= step.durationSec
        break
      }
      case 'move': {
        setClipOnce(step.clip ?? 'walk')
        const tl = st.current.targetLocal
        if (tl) {
          const dx = tl.x - rig.position.x
          const dz = tl.z - rig.position.z
          const dist = Math.hypot(dx, dz)
          const stop = step.distance ?? 1
          if (dist <= stop) {
            done = true
          } else {
            const move = Math.min(st.current.speed * dt, dist - stop)
            const nx = rig.position.x + (dx / dist) * move
            const nz = rig.position.z + (dz / dist) * move
            // Collision: stop if the next step would overlap a non-target obstacle.
            const worldX = character.position[0] + nx
            const worldZ = character.position[2] + nz
            const hit = st.current.obstacles.some(
              (o) => Math.hypot(worldX - o.x, worldZ - o.z) < MY_RADIUS + o.r + 0.1,
            )
            if (hit) {
              done = true
            } else {
              rig.position.x = nx
              rig.position.z = nz
              rig.rotation.y = Math.atan2(dx, dz)
            }
          }
        } else {
          done = true
        }
        if (elapsed >= step.durationSec) done = true
        break
      }
    }

    if (done) {
      const next = st.current.index + 1
      if (next < ctrl.steps.length) beginStep(next, t, rig)
      else setClipOnce('idle')
    }
  })

  return clip
}

/** Shortest-path angular lerp. */
function lerpAngle(a: number, b: number, t: number): number {
  let d = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI
  if (d < -Math.PI) d += Math.PI * 2
  return a + d * t
}
