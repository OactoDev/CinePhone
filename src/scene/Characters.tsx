import { Suspense } from 'react'
import { getPreset } from '../config/characters'
import { selectActiveScene, useEditorStore } from '../state/useEditorStore'
import type { Vec3 } from '../types/scene'
import { Character } from './Character'
import { GltfCharacter } from './GltfCharacter'
import { Movable } from './Movable'
import { terrainHeightAt } from './terrain/generateTerrain'

/** Renders every performer in the active scene, resting on the terrain, each
 *  wrapped in a Movable for select + drag. */
export function Characters() {
  const characters = useEditorStore((s) => selectActiveScene(s).characters)
  const terrainId = useEditorStore((s) => selectActiveScene(s).terrainId)

  return (
    <group>
      {characters.map((character) => {
        const preset = getPreset(character.presetId)
        // Gravity: rest the character on the ground (terrain height at x,z).
        const groundY = terrainHeightAt(terrainId, character.position[0], character.position[2])
        const pos: Vec3 = [character.position[0], groundY, character.position[2]]
        return (
          <Movable key={character.id} id={character.id} position={pos}>
            {preset ? (
              <Suspense fallback={null}>
                <GltfCharacter character={character} preset={preset} />
              </Suspense>
            ) : (
              <Character character={character} />
            )}
          </Movable>
        )
      })}
    </group>
  )
}
