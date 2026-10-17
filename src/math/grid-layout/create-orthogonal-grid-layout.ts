import { GridLayout } from './grid-layout.js';
import { assertCellSize, LatticeGridLayout } from './lattice-grid-layout.js';

/**
 * Options for {@link createOrthogonalGridLayout}.
 */
export interface OrthogonalGridLayoutOptions {
  /** The width of a cell, in local units. */
  cellWidth: number;

  /** The height of a cell, in local units. */
  cellHeight: number;
}

/**
 * Creates a layout of rectangular cells, `cellWidth` by `cellHeight`. Local
 * space is Y-down, so cell `(c, r)` covers the rect from `(c * cellWidth,
 * r * cellHeight)` to `((c + 1) * cellWidth, (r + 1) * cellHeight)`, and owns
 * its top and left edges. Drawing its cells in row-major order is back to
 * front, under the preconditions {@link GridLayout} states.
 * @param options - The cell size.
 * @returns The grid layout.
 * @throws An error if `cellWidth` or `cellHeight` isn't a positive finite
 * number.
 */
export function createOrthogonalGridLayout(
  options: OrthogonalGridLayoutOptions,
): GridLayout {
  const { cellWidth, cellHeight } = options;

  assertCellSize('createOrthogonalGridLayout', 'cellWidth', cellWidth);
  assertCellSize('createOrthogonalGridLayout', 'cellHeight', cellHeight);

  return new LatticeGridLayout(
    cellWidth,
    cellHeight,
    { x: cellWidth, y: 0 },
    { x: 0, y: cellHeight },
  );
}
