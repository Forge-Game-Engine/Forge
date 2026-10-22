import { GridLayout } from '../../math/grid-layout/grid-layout.js';

/**
 * The world lengths of a grid layout's four kinds of step between cell
 * centres. A layout is a linear map from cell space, so a step's length
 * only depends on its cell-space offset, and these four describe every
 * step a navigation grid takes.
 */
export interface GridMetric {
  /** The length of a step of one column, `(±1, 0)`. */
  readonly columnLength: number;

  /** The length of a step of one row, `(0, ±1)`. */
  readonly rowLength: number;

  /**
   * The length of a diagonal step whose column and row change the same
   * way, `(1, 1)` or `(-1, -1)`.
   */
  readonly sameSignDiagonalLength: number;

  /**
   * The length of a diagonal step whose column and row change opposite
   * ways, `(1, -1)` or `(-1, 1)`.
   */
  readonly oppositeSignDiagonalLength: number;
}

/**
 * Measures a layout's four kinds of step.
 * @param layout - The layout, which must be a linear map from cell space.
 * @returns The step lengths.
 */
export const createGridMetric = (layout: GridLayout): GridMetric => {
  const columnStep = layout.cellSpaceToLocal({ x: 1, y: 0 });
  const rowStep = layout.cellSpaceToLocal({ x: 0, y: 1 });

  return {
    columnLength: Math.hypot(columnStep.x, columnStep.y),
    rowLength: Math.hypot(rowStep.x, rowStep.y),
    sameSignDiagonalLength: Math.hypot(
      columnStep.x + rowStep.x,
      columnStep.y + rowStep.y,
    ),
    oppositeSignDiagonalLength: Math.hypot(
      columnStep.x - rowStep.x,
      columnStep.y - rowStep.y,
    ),
  };
};

/**
 * Finds the length of the shortest path between two cells of an unbounded,
 * empty grid, moving between cell centres. On square cells it's Manhattan
 * distance for 4-way movement and octile distance for 8-way movement, both
 * times the cell size.
 *
 * With 8-way movement, the cheapest mix of steps for an offset uses the
 * two kinds of step on either side of it, one orthogonal and one diagonal.
 * The layout keeps the order of directions around a cell, and the
 * triangle inequality makes every step no longer than any other steps that
 * add up to it, so that pair is the same on every layout.
 * @param metric - The layout's step lengths.
 * @param columnOffset - The integer column offset between the cells.
 * @param rowOffset - The integer row offset between the cells.
 * @param diagonals - Whether diagonal steps are allowed.
 * @returns The length of the shortest path.
 */
export const getGridDistance = (
  metric: GridMetric,
  columnOffset: number,
  rowOffset: number,
  diagonals: boolean,
): number => {
  const columns = Math.abs(columnOffset);
  const rows = Math.abs(rowOffset);

  if (!diagonals) {
    return columns * metric.columnLength + rows * metric.rowLength;
  }

  const diagonalLength =
    columnOffset * rowOffset >= 0
      ? metric.sameSignDiagonalLength
      : metric.oppositeSignDiagonalLength;

  if (columns > rows) {
    return rows * diagonalLength + (columns - rows) * metric.columnLength;
  }

  return columns * diagonalLength + (rows - columns) * metric.rowLength;
};
