import { GridCell } from '../../math/grid-layout/grid-layout.js';
import { Vector2 } from '../../math/vector2.js';
import { NavigationGrid } from './navigation-grid.js';

/** The cell a path's end resolved to. */
export interface SnappedCell {
  /** The cell to search from or to. */
  readonly cell: GridCell;

  /** `true` when `cell` isn't the cell the position is in. */
  readonly snapped: boolean;
}

/**
 * Finds the walkable cell nearest a position among the cells at exactly
 * `ring` cells from `center` on either axis.
 * @param grid - The grid.
 * @param center - The cell the rings are around.
 * @param ring - The ring's distance from `center`, `0` for `center` itself.
 * @param position - The world position to measure from.
 * @returns The cell whose centre is nearest `position`, the lower node id
 * when tied, or `null` if the ring has no walkable cell in the grid.
 */
const findNearestInRing = (
  grid: NavigationGrid,
  center: GridCell,
  ring: number,
  position: Vector2,
): GridCell | null => {
  let best: GridCell | null = null;
  let bestDistance = Infinity;

  const consider = (column: number, row: number): void => {
    if (!grid.hasCell(column, row) || !grid.isWalkable(column, row)) {
      return;
    }

    const cellCenter = grid.cellToWorld(column, row);
    const distance = Math.hypot(
      cellCenter.x - position.x,
      cellCenter.y - position.y,
    );

    // Cells are considered in node id order, so a tie keeps the lower id.
    if (distance < bestDistance) {
      best = { column, row };
      bestDistance = distance;
    }
  };

  for (let row = center.row - ring; row <= center.row + ring; row++) {
    if (Math.abs(row - center.row) === ring) {
      for (
        let column = center.column - ring;
        column <= center.column + ring;
        column++
      ) {
        consider(column, row);
      }

      continue;
    }

    consider(center.column - ring, row);
    consider(center.column + ring, row);
  }

  return best;
};

/**
 * Finds the cell a path should start or end in for a world position: the
 * cell the position is in when it's walkable, or else the walkable cell
 * nearest the position in the nearest ring of cells around it, up to
 * `snapRadius` rings out. A position outside the grid starts from the
 * grid's nearest edge cell. When no walkable cell is close enough, it's
 * that cell, walkable or not.
 * @param grid - The grid.
 * @param position - The world position, which must be finite.
 * @param snapRadius - How many rings of cells to look through, a
 * non-negative integer.
 * @returns The cell, and whether it isn't the cell the position is in.
 */
export const snapToWalkableCell = (
  grid: NavigationGrid,
  position: Vector2,
  snapRadius: number,
): SnappedCell => {
  const { origin } = grid;
  const unclamped = grid.layout.localToCell({
    x: position.x - origin.x,
    y: position.y - origin.y,
  });
  const cell = {
    column: Math.min(Math.max(unclamped.column, 0), grid.columns - 1),
    row: Math.min(Math.max(unclamped.row, 0), grid.rows - 1),
  };
  const isInGrid =
    cell.column === unclamped.column && cell.row === unclamped.row;

  if (isInGrid && grid.isWalkable(cell.column, cell.row)) {
    return { cell, snapped: false };
  }

  for (let ring = 0; ring <= snapRadius; ring++) {
    const nearest = findNearestInRing(grid, cell, ring, position);

    if (nearest !== null) {
      return { cell: nearest, snapped: true };
    }
  }

  return { cell, snapped: !isInGrid };
};
