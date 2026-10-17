import { GridLayout } from './grid-layout.js';
import { assertCellSize, LatticeGridLayout } from './lattice-grid-layout.js';

/**
 * Options for {@link createIsometricGridLayout}.
 */
export interface IsometricGridLayoutOptions {
  /** The diamond's full width, in local units, as in Tiled. */
  cellWidth: number;

  /** The diamond's full height, in local units, as in Tiled. */
  cellHeight: number;
}

/**
 * Creates a layout of diamond cells, `cellWidth` wide and `cellHeight` tall:
 * Tiled's `"isometric"` orientation (a 2:1 isometric tile is `64` by `32`).
 * Local space is Y-down, so moving one column goes down and right, moving
 * one row goes down and left, and cell `(c, r)` is the diamond whose top
 * corner is at `((c - r) * cellWidth / 2, (c + r) * cellHeight / 2)`. Unlike
 * Tiled, it adds no x offset to keep a finite map on positive coordinates. A
 * cell owns its top-left and top-right edges and its top corner. Drawing its
 * cells in row-major order is back to front, under the preconditions
 * {@link GridLayout} states.
 * @param options - The diamond's size.
 * @returns The grid layout.
 * @throws An error if `cellWidth` or `cellHeight` isn't a positive finite
 * number.
 */
export function createIsometricGridLayout(
  options: IsometricGridLayoutOptions,
): GridLayout {
  const { cellWidth, cellHeight } = options;

  assertCellSize('createIsometricGridLayout', 'cellWidth', cellWidth);
  assertCellSize('createIsometricGridLayout', 'cellHeight', cellHeight);

  const halfWidth = cellWidth / 2;
  const halfHeight = cellHeight / 2;

  return new LatticeGridLayout(
    cellWidth,
    cellHeight,
    { x: halfWidth, y: halfHeight },
    { x: -halfWidth, y: halfHeight },
  );
}
