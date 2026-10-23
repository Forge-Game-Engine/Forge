import { clamp } from '../../math/clamp.js';
import { Vector2 } from '../../math/vector2.js';
import { NavigationGrid } from './navigation-grid.js';

/**
 * Called for each cell a segment touches.
 * @param column - The cell's column.
 * @param row - The cell's row.
 * @param share - The fraction of the segment's length inside the cell,
 * from `0` (it only touches an edge or corner) to `1`. The shares of every
 * cell add up to `1`; a stretch along the edge between cells is split
 * equally between them.
 * @returns `false` to stop the walk.
 */
export type SegmentCellVisitor = (
  column: number,
  row: number,
  share: number,
) => boolean;

const assertFinitePosition = (name: string, position: Vector2): void => {
  if (!Number.isFinite(position.x) || !Number.isFinite(position.y)) {
    throw new Error(
      `Unable to walk a segment across a navigation grid, ${name} (${position.x}, ${position.y}) isn't finite.`,
    );
  }
};

/** The part of a segment inside one column's strip, in cell space. */
interface StripPart {
  /** The column. */
  column: number;
  /** The fraction of the segment's length inside the strip. */
  share: number;
  /** The Y the part starts at, walking from the segment's start. */
  fromY: number;
  /** The Y the part ends at. */
  toY: number;
}

/**
 * Visits every row of a column's strip that part of a segment touches,
 * from the start's end. Each row gets the part of the strip's share whose
 * Y is in it. A horizontal part lies in one row, or along the edge between
 * two, which then share it.
 * @param strip - The part of the segment inside the strip.
 * @param tolerance - How far a Y may miss a row's edge and still touch it.
 * @param visit - Called for each cell the part touches.
 * @returns `false` if `visit` stopped the walk, `true` otherwise.
 */
const visitStripRows = (
  strip: StripPart,
  tolerance: number,
  visit: SegmentCellVisitor,
): boolean => {
  const { column, share, fromY, toY } = strip;
  const lowY = Math.min(fromY, toY);
  const highY = Math.max(fromY, toY);
  const minRow = Math.ceil(lowY - tolerance) - 1;
  const maxRow = Math.floor(highY + tolerance);
  const rowStep = toY >= fromY ? 1 : -1;
  const startRow = toY >= fromY ? minRow : maxRow;
  const rowCount = maxRow - minRow + 1;

  for (let i = 0; i < rowCount; i++) {
    const row = startRow + i * rowStep;
    const rowShare =
      highY > lowY
        ? (share *
            Math.max(0, Math.min(highY, row + 1) - Math.max(lowY, row))) /
          (highY - lowY)
        : share / rowCount;

    if (!visit(column, row, rowShare)) {
      return false;
    }
  }

  return true;
};

/**
 * Visits every cell a segment between two world positions touches, edges
 * and corners included, from the start's end. The cells don't have to be
 * in the grid.
 *
 * The segment is walked in the grid's cell space, where every cell is a
 * unit square, so it works the same on every layout. Every layout maps
 * cell space linearly, so a cell's share of the segment's length is the
 * same in cell space and in the world. A point that misses a cell's edge
 * or corner by a rounding error, such as a cell centre mapped through an
 * isometric layout, still counts as touching it.
 * @param grid - The grid.
 * @param fromWorld - The world position the segment starts at.
 * @param toWorld - The world position the segment ends at.
 * @param visit - Called for each cell the segment touches.
 * @returns `false` if `visit` stopped the walk, `true` otherwise.
 * @throws An error if either position isn't finite.
 */
export const walkSegmentCells = (
  grid: NavigationGrid,
  fromWorld: Vector2,
  toWorld: Vector2,
  visit: SegmentCellVisitor,
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
  // c's closed strip [c, c + 1] holds the part of the segment from tEnter
  // to tExit, and every row whose closed square that part reaches is a
  // cell the segment touches. A vertical segment lies in one strip, or
  // along the edge between two, which then share it.
  for (let i = 0; i < columnCount; i++) {
    const column = startColumn + i * columnStep;
    let strip: StripPart = {
      column,
      share: 1 / columnCount,
      fromY: from.y,
      toY: to.y,
    };

    if (dx !== 0) {
      // A segment walked leftwards enters the strip at its right edge.
      const tLeft = clamp((column - from.x) / dx, 0, 1);
      const tRight = clamp((column + 1 - from.x) / dx, 0, 1);
      const tEnter = Math.min(tLeft, tRight);
      const tExit = Math.max(tLeft, tRight);

      strip = {
        column,
        share: tExit - tEnter,
        fromY: from.y + tEnter * dy,
        toY: from.y + tExit * dy,
      };
    }

    if (!visitStripRows(strip, tolerance, visit)) {
      return false;
    }
  }

  return true;
};
