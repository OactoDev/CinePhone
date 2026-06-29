import { useAnimations, useGLTF } from '@react-three/drei'
import { useEffect, useMemo, useRef } from 'react'
import { Group } from 'three'
import { SkeletonUtils } from 'three-stdlib'
import { CHARACTER_PRESETS, resolveClipName, type CharacterPreset } from '../config/characters'
import { useCharacterRuntime } from '../choreo/useCharacterRuntime'
import { modelProxyUrl } from '../cloud/modelCatalog'
import { useEditorStore } from '../state/useEditorStore'
import type { Character } from '../types/film'

/**
 * A rigged GLB performer. Loads the preset model, clones it (SkeletonUtils, so
 * multiple instances of the same GLB each get their own skeleton), plays its
 * animations via drei `useAnimations`, and crossfades to the clip chosen by the
 * shared character runtime. The runtime moves/rotates the inner `rig` group.
 */
export function GltfCharacter({ character, preset }: { character: Character; preset: CharacterPreset }) {
  // Prefer the cloud (S3) model when cataloged, else the bundled file.
  const s3Key = useEditorStore((s) => s.modelCatalog[preset.id])
  const { scene, animations } = useGLTF(s3Key ? modelProxyUrl(s3Key) : preset.modelUrl)
  const cloned = useMemo(() => {
    const c = SkeletonUtils.clone(scene)
    c.traverse((o) => {
      const m = o as unknown as { isMesh?: boolean; castShadow?: boolean; receiveShadow?: boolean }
      if (m.isMesh) {
        m.castShadow = true
        m.receiveShadow = true
      }
    })
    return c
  }, [scene])

  const model = useRef<Group>(null) // mixer root (wraps the cloned model)
  const rig = useRef<Group>(null) // local move/rotate group, driven by the runtime
  const { actions } = useAnimations(animations, model)
  const clip = useCharacterRuntime(character, rig)

  const currentName = useRef<string | null>(null)
  useEffect(() => {
    const wanted = resolveClipName(preset, clip)
    const names = Object.keys(actions)
    const name =
      wanted && actions[wanted] ? wanted : preset.clipAliases.idle && actions[preset.clipAliases.idle] ? preset.clipAliases.idle : names[0]
    if (!name || name === currentName.current) return
    actions[name]?.reset().fadeIn(0.25).play()
    if (currentName.current) actions[currentName.current]?.fadeOut(0.25)
    currentName.current = name
  }, [clip, actions, preset])

  return (
    // Positioned by <Movable>; the runtime translates the inner rig locally.
    <group ref={rig}>
      <group ref={model}>
        <primitive object={cloned} scale={preset.scale} />
      </group>
    </group>
  )
}

// Preload all preset models so spawning is instant.
CHARACTER_PRESETS.forEach((p) => useGLTF.preload(p.modelUrl))
