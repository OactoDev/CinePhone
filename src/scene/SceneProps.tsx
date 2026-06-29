import { useGLTF } from '@react-three/drei'
import { Suspense, useMemo } from 'react'
import { SkeletonUtils } from 'three-stdlib'
import { getProp, PROP_PRESETS, type PropPreset } from '../config/props'
import { modelProxyUrl } from '../cloud/modelCatalog'
import { selectActiveScene, useEditorStore } from '../state/useEditorStore'
import type { Vec3 } from '../types/scene'
import { Movable } from './Movable'
import { terrainHeightAt } from './terrain/generateTerrain'

/** A single static GLB prop (cloned, transformed by <Movable>). */
function GltfProp({ preset }: { preset: PropPreset }) {
  const s3Key = useEditorStore((s) => s.modelCatalog[preset.id])
  const { scene } = useGLTF(s3Key ? modelProxyUrl(s3Key) : preset.modelUrl)
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

  // Movable owns position/rotation/scale; the primitive keeps only the preset's
  // intrinsic scale (prop.scale is applied by Movable's group).
  return <primitive object={cloned} scale={preset.scale} />
}

/** Renders all placed GLB props in the active scene, resting on the terrain. */
export function SceneProps() {
  const props = useEditorStore((s) => selectActiveScene(s).props)
  const terrainId = useEditorStore((s) => selectActiveScene(s).terrainId)
  return (
    <group>
      {props.map((prop) => {
        const preset = getProp(prop.presetId)
        if (!preset) return null
        const groundY = terrainHeightAt(terrainId, prop.position[0], prop.position[2])
        const pos: Vec3 = [prop.position[0], groundY, prop.position[2]]
        return (
          <Movable key={prop.id} id={prop.id} position={pos} rotation={prop.rotation} scale={prop.scale}>
            <Suspense fallback={null}>
              <GltfProp preset={preset} />
            </Suspense>
          </Movable>
        )
      })}
    </group>
  )
}

PROP_PRESETS.forEach((p) => useGLTF.preload(p.modelUrl))
