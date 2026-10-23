import { clamp } from '../../math/clamp.js';
import { Vector2 } from '../../math/vector2.js';
import { NavigationGrid } from './navigation-grid.js';

const assertFinitePosition = (name: string, position: Vector2): void => {
  if (!Number.isFinite(position.x) || !Number.isFinite(position.y)) {
    throw new Error(
      `Unable to check line of sight, ${name} (${position.x}, ${position.y}) isn't finite.`,
    );
  }
};

/**
 * Checks whether a cell is in the grid and walkable.
 * @param grid - The grid.
 * @param column - The cell's column.
 * @param row - The cell's row.
 * @returns `true` if a path can enter the cell.
 */
const isOpen = (grid: NavigationGrid, column: number, row: number): boolean =>
  grid.hasCell(column, row) && grid.isWalkable(column, row);

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
): boolean => {
  assertFinitePosition('fromWorld', fromWorld);
  assertFinitePosition('toWorld', toWorld);

  const { layout, origin } = grid;
  const from = layout.localToCellSpace({
    x: fromWorld.x - origin.x,
    y: fromWorld.y - origin.y,
  });
  const to = layout.localToCellSpace({
    x: toWorld.x - origin.x,
    y: toWorld.y - origin.y,
  });

  // Mapping a world position into cell space rounds, so a segment through
  // a corner can miss it by a few units in the last place. Widening every
  // range by a tolerance relative to the coordinates' size counts it.
  const tolerance =
    1e-9 *
    Math.max(
      1,
      Math.abs(from.x),
      Math.abs(from.y),
      Math.abs(to.x),
      Math.abs(to.y),
    );
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const minX = Math.min(from.x, to.x);
  const maxX = Math.max(from.x, to.x);
  const firstColumn = Math.ceil(minX - tolerance) - 1;
  const lastColumn = Math.floor(maxX + tolerance);
  const columnStep = dx >= 0 ? 1 : -1;
  const startColumn = dx >= 0 ? firstColumn : lastColumn;
  const columnCount = lastColumn - firstColumn + 1;

  // A supercover walk, one column at a time from the start's end: column
  // c's closed strip [c, c + 1] holds part of the segment, and every row
  // whose closed square that part reaches is a cell the segment touches.
  for (let i = 0; i < columnCount; i++) {
    const column = startColumn + i * columnStep;
    let fromRowY = from.y;
    let toRowY = to.y;

    if (dx !== 0) {
      const t0 = clamp((column - from.x) / dx, 0, 1);
      const t1 = clamp((column + 1 - from.x) / dx, 0, 1);

      fromRowY = from.y + t0 * dy;
      toRowY = from.y + t1 * dy;
    }

    const minRow = Math.ceil(Math.min(fromRowY, toRowY) - tolerance) - 1;
    const maxRow = Math.floor(Math.max(fromRowY, toRowY) + tolerance);

    for (let row = minRow; row <= maxRow; row++) {
      if (!isOpen(grid, column, row)) {
        return false;
      }
    }
  }

  return true;
};
