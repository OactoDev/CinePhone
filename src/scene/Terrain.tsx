import { useMemo } from 'react'
import { TERRAIN_PRESETS } from '../config/library'
import { useEditorStore } from '../state/useEditorStore'
import { GridFloor } from './GridFloor'
import { generateTerrainGeometry } from './terrain/generateTerrain'

/**
 * The ground. Renders the infinite grid for the "Flat Grid" preset, otherwise
 * a procedurally displaced terrain mesh. Geometry is memoised per preset id so
 * switching presets is cheap and switching back is instant.
 */
export function Terrain() {
  const terrainId = useEditorStore((s) => s.terrainId)
  const preset = TERRAIN_PRESETS.find((p) => p.id === terrainId) ?? TERRAIN_PRESETS[0]

  const geometry = useMemo(
    () => (preset.kind === 'procedural' ? generateTerrainGeometry(preset) : null),
    [preset],
  )

  if (preset.kind === 'grid' || !geometry) return <GridFloor />

  return (
    <mesh geometry={geometry} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <meshStandardMaterial color={preset.color} roughness={0.95} metalness={0} flatShading={false} />
    </mesh>
  )
}
