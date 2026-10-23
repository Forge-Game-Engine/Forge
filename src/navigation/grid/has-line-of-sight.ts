import { Vector2 } from '../../math/vector2.js';
import { NavigationGrid } from './navigation-grid.js';
import { walkSegmentCells } from './walk-segment-cells.js';

/**
 * Checks whether a unit can walk in a straight line between two world
 * positions on a navigation grid: every cell the segment touches is in the
 * grid and walkable. A cell counts when the segment touches any part of
 * it, its edges and corners included, so a segment through the exact
 * corner where four cells meet needs all four, and a segment that only
 * grazes a blocked cell's edge or corner isn't in line of sight. A path
 * that keeps to such segments never clips the corner of a wall, the way a
 * `'noCornerCutting'` grid's diagonal steps don't. Cell costs don't
 * matter, only walkability.
 *
 * The segment is walked in the grid's cell space, where every cell is a
 * unit square, so it works the same on every layout. A point that misses
 * a cell's edge or corner by a rounding error, such as a cell centre
 * mapped through an isometric layout, still counts as touching it.
 * @param grid - The grid.
 * @param fromWorld - The world position the segment starts at.
 * @param toWorld - The world position the segment ends at.
 * @returns `true` if every cell the segment touches is walkable.
 * @throws An error if either position isn't finite.
 */
export const hasLineOfSight = (
  grid: NavigationGrid,
  fromWorld: Vector2,
  toWorld: Vector2,
): boolean =>
  walkSegmentCells(
    grid,
    fromWorld,
    toWorld,
    (column, row) => grid.hasCell(column, row) && grid.isWalkable(column, row),
  );
