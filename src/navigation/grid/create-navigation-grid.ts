import { GridCellRange } from '../../math/grid-layout/grid-layout.js';
import { withDefaults } from '../../utilities/with-defaults.js';
import { DenseNavigationGrid } from './dense-navigation-grid.js';
import {
  NavigationGrid,
  NavigationGridDiagonals,
  NavigationGridOptions,
} from './navigation-grid.js';

const defaultNavigationGridOptions: Required<
  Pick<NavigationGridOptions, 'origin' | 'diagonals'>
> = {
  origin: { x: 0, y: 0 },
  diagonals: 'noCornerCutting',
};

const navigationGridDiagonals: readonly NavigationGridDiagonals[] = [
  'never',
  'always',
  'noCornerCutting',
];

// Node ids are cell indices, and the search keeps them in 32-bit arrays.
const maxCellCount = 2 ** 31 - 1;

const assertCells = (cells: GridCellRange): void => {
  const { minColumn, minRow, maxColumn, maxRow } = cells;
  const bounds = `(${minColumn}, ${minRow}) to (${maxColumn}, ${maxRow})`;

  // Safe integers keep every cell's offset from the first cell, and so its
  // node id, exact.
  if (
    !Number.isSafeInteger(minColumn) ||
    !Number.isSafeInteger(minRow) ||
    !Number.isSafeInteger(maxColumn) ||
    !Number.isSafeInteger(maxRow)
  ) {
    throw new Error(
      `createNavigationGrid: the bounds of cells must be safe integers, received ${bounds}.`,
    );
  }

  if (minColumn > maxColumn || minRow > maxRow) {
    throw new Error(
      `createNavigationGrid: the min of cells must not be greater than its max, received ${bounds}.`,
    );
  }

  const columns = maxColumn - minColumn + 1;
  const rows = maxRow - minRow + 1;

  if (columns * rows > maxCellCount) {
    throw new Error(
      `createNavigationGrid: cells from ${bounds} are ${columns} x ${rows}, ${columns * rows} cells, more than the most a grid can have, ${maxCellCount}.`,
    );
  }
};

/**
 * Creates a navigation grid with every cell walkable and costing `1`. The
 * grid's cells, layout, origin and diagonal rule are fixed once it's
 * created; a level of another size needs a new grid.
 * @param options - The grid's cells, layout, origin and diagonal rule.
 * @returns The navigation grid.
 * @throws An error if a bound of `cells` isn't a safe integer, if its min
 * is greater than its max, if it holds more than `2^31 - 1` cells, if
 * `origin` isn't finite, or if `diagonals` isn't `'never'`, `'always'` or
 * `'noCornerCutting'`.
 */
export function createNavigationGrid(
  options: NavigationGridOptions,
): NavigationGrid {
  const { cells, layout, origin, diagonals } = withDefaults(
    defaultNavigationGridOptions,
    options,
  );

  assertCells(cells);

  if (!Number.isFinite(origin.x) || !Number.isFinite(origin.y)) {
    throw new Error(
      `createNavigationGrid: origin must be finite, received (${origin.x}, ${origin.y}).`,
    );
  }

  if (!navigationGridDiagonals.includes(diagonals)) {
    throw new Error(
      `createNavigationGrid: diagonals must be 'never', 'always' or 'noCornerCutting', received '${String(diagonals)}'.`,
    );
  }

  return new DenseNavigationGrid(cells, layout, origin, diagonals);
}
