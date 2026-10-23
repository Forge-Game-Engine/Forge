import { clamp } from '../../math/clamp.js';
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
 * Finds the point of a segment nearest a point.
 * @param point - The point.
 * @param start - The segment's start.
 * @param end - The segment's end.
 * @returns A new `Vector2` on the segment.
 */
const getNearestPointOnSegment = (
  point: Vector2,
  start: Vector2,
  end: Vector2,
): Vector2 => {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const t = clamp(
    ((point.x - start.x) * dx + (point.y - start.y) * dy) / (dx * dx + dy * dy),
    0,
    1,
  );

  return { x: start.x + t * dx, y: start.y + t * dy };
};

/**
 * Finds the cell on a grid's edge nearest a position outside it, in the
 * world. The grid's outline is a parallelogram in the world (a rectangle
 * for an orthogonal layout), so the nearest point of the grid is on one of
 * its four sides; clamping the position's column and row separately would
 * only find it when the layout's axes are perpendicular.
 * @param grid - The grid.
 * @param position - The world position, outside the grid.
 * @returns The edge cell.
 */
const findNearestEdgeCell = (
  grid: NavigationGrid,
  position: Vector2,
): GridCell => {
  const { layout, origin, cells } = grid;
  const { minColumn, minRow, maxColumn, maxRow } = cells;
  const local = { x: position.x - origin.x, y: position.y - origin.y };
  const corners = [
    layout.cellSpaceToLocal({ x: minColumn, y: minRow }),
    layout.cellSpaceToLocal({ x: maxColumn + 1, y: minRow }),
    layout.cellSpaceToLocal({ x: maxColumn + 1, y: maxRow + 1 }),
    layout.cellSpaceToLocal({ x: minColumn, y: maxRow + 1 }),
  ];
  let nearest = corners[0];
  let nearestDistance = Infinity;

  for (let i = 0; i < corners.length; i++) {
    const candidate = getNearestPointOnSegment(
      local,
      corners[i],
      corners[(i + 1) % corners.length],
    );
    const distance = Math.hypot(candidate.x - local.x, candidate.y - local.y);

    if (distance < nearestDistance) {
      nearest = candidate;
      nearestDistance = distance;
    }
  }

  // The nearest point is on the outline, where the far sides and rounding
  // can put it in the cell just outside, so the cell is clamped into the
  // grid.
  const cellSpace = layout.localToCellSpace(nearest);

  return {
    column: clamp(Math.floor(cellSpace.x), minColumn, maxColumn),
    row: clamp(Math.floor(cellSpace.y), minRow, maxRow),
  };
};

/**
 * Finds the cell a path should start or end in for a world position: the
 * cell the position is in when it's walkable, or else the walkable cell
 * nearest the position in the nearest ring of cells around it, up to
 * `snapRadius` rings out. A position outside the grid starts from the
 * edge cell nearest it in the world. When no walkable cell is close
 * enough, it's that cell, walkable or not.
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
  const cellInGrid = grid.worldToCell(position);

  if (
    cellInGrid !== null &&
    grid.isWalkable(cellInGrid.column, cellInGrid.row)
  ) {
    return { cell: cellInGrid, snapped: false };
  }

  const isInGrid = cellInGrid !== null;
  const cell = cellInGrid ?? findNearestEdgeCell(grid, position);

  for (let ring = 0; ring <= snapRadius; ring++) {
    const nearest = findNearestInRing(grid, cell, ring, position);

    if (nearest !== null) {
      return { cell: nearest, snapped: true };
    }
  }

  return { cell, snapped: !isInGrid };
};
