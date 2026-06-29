import { Grid } from '@react-three/drei'
import { GRID } from '../config/studio'

/**
 * Infinite ground grid: light-grey lines on the near-white stage that recede
 * and fade into the fog, giving the sense of a boundless plane. Replaces the
 * old studio box as the sandbox floor.
 */
export function GridFloor() {
  return (
    <Grid
      // Render at floor level; `infiniteGrid` makes it follow out to the horizon.
      position={[0, 0, 0]}
      infiniteGrid
      cellSize={GRID.cellSize}
      cellThickness={GRID.cellThickness}
      cellColor={GRID.cellColor}
      sectionSize={GRID.sectionSize}
      sectionThickness={GRID.sectionThickness}
      sectionColor={GRID.sectionColor}
      fadeDistance={GRID.fadeDistance}
      fadeStrength={GRID.fadeStrength}
      // Keep the grid visible from below too, so looking around never clips it.
      side={2}
    />
  )
}
