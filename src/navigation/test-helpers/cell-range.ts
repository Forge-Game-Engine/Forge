import { GridCellRange } from '../../math/grid-layout/grid-layout.js';

/**
 * Builds the inclusive range of a block of cells.
 * @param columns - The number of columns.
 * @param rows - The number of rows.
 * @param minColumn - The first column.
 * @param minRow - The first row.
 * @returns The range from `(minColumn, minRow)`, `columns` by `rows` cells.
 */
export const cellRange = (
  columns: number,
  rows: number,
  minColumn = 0,
  minRow = 0,
): GridCellRange => ({
  minColumn,
  minRow,
  maxColumn: minColumn + columns - 1,
  maxRow: minRow + rows - 1,
});
