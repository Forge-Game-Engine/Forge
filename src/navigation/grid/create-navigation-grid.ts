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

const assertCount = (name: string, value: number): void => {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(
      `createNavigationGrid: ${name} must be a positive integer, received ${value}.`,
    );
  }
};

/**
 * Creates a navigation grid with every cell walkable and costing `1`. The
 * grid's size, layout, origin and diagonal rule are fixed once it's
 * created; a level of another size needs a new grid.
 * @param options - The grid's size, layout, origin and diagonal rule.
 * @returns The navigation grid.
 * @throws An error if `columns` or `rows` isn't a positive integer, if
 * `columns * rows` is more than `2^31 - 1`, if `origin` isn't finite, or if
 * `diagonals` isn't `'never'`, `'always'` or `'noCornerCutting'`.
 */
export function createNavigationGrid(
  options: NavigationGridOptions,
): NavigationGrid {
  const { columns, rows, layout, origin, diagonals } = withDefaults(
    defaultNavigationGridOptions,
    options,
  );

  assertCount('columns', columns);
  assertCount('rows', rows);

  if (columns * rows > maxCellCount) {
    throw new Error(
      `createNavigationGrid: a grid of ${columns} x ${rows} has ${columns * rows} cells, more than the most a grid can have, ${maxCellCount}.`,
    );
  }

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

  return new DenseNavigationGrid(columns, rows, layout, origin, diagonals);
}
