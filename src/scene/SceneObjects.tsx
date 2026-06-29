import { Outlines } from '@react-three/drei'
import { selectActiveScene, useEditorStore } from '../state/useEditorStore'
import type { ObjectKind, SceneObject } from '../types/objects'
import { Movable } from './Movable'

/** Geometry element for each object kind (default unit-ish sizes). */
function Geometry({ kind }: { kind: ObjectKind }) {
  switch (kind) {
    case 'cube':
      return <boxGeometry args={[1.4, 1.4, 1.4]} />
    case 'sphere':
      return <sphereGeometry args={[0.9, 48, 48]} />
    case 'cylinder':
      return <cylinderGeometry args={[0.7, 0.7, 1.6, 40]} />
    case 'cone':
      return <coneGeometry args={[0.8, 1.6, 40]} />
    case 'torus':
      return <torusGeometry args={[0.7, 0.26, 24, 80]} />
    case 'torusKnot':
      return <torusKnotGeometry args={[0.5, 0.18, 160, 24]} />
  }
}

function ObjectMesh({ object }: { object: SceneObject }) {
  const selected = useEditorStore((s) => s.selectedId === object.id)
  // Metallic look for sphere/knot, matte for the rest — keeps the sandbox lively.
  const shiny = object.kind === 'sphere' || object.kind === 'torusKnot'

  return (
    <Movable id={object.id} position={object.position} rotation={object.rotation} scale={object.scale}>
      <mesh castShadow receiveShadow>
        <Geometry kind={object.kind} />
        <meshStandardMaterial
          color={object.color}
          roughness={shiny ? 0.2 : 0.4}
          metalness={shiny ? 0.5 : 0.1}
        />
        {selected && <Outlines thickness={4} color="#111418" />}
      </mesh>
    </Movable>
  )
}

/**
 * Renders all user-placed objects from the store. Clicking empty space (handled
 * by the parent via the canvas) clears selection; clicking a mesh selects it.
 */
export function SceneObjects() {
  const objects = useEditorStore((s) => selectActiveScene(s).objects)
  return (
    <group>
      {objects.map((object) => (
        <ObjectMesh key={object.id} object={object} />
      ))}
    </group>
  )
}
