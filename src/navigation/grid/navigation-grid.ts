import {
  GridCell,
  GridCellRange,
  GridLayout,
} from '../../math/grid-layout/grid-layout.js';
import { Vector2 } from '../../math/vector2.js';
import { NavigationGraph } from '../navigation-graph.js';

/**
 * Which diagonal steps a navigation grid allows. A diagonal step goes from
 * cell `(c, r)` to `(c ± 1, r ± 1)`.
 * - `'never'`: only orthogonal steps (4-way movement).
 * - `'always'`: every diagonal step into a walkable cell (8-way movement).
 * - `'noCornerCutting'`: a diagonal step only when both cells it passes
 *   between, `(c ± 1, r)` and `(c, r ± 1)`, are walkable too, so a unit
 *   never clips the corner of a wall.
 */
export type NavigationGridDiagonals = 'never' | 'always' | 'noCornerCutting';

/** Options for {@link createNavigationGrid}. */
export interface NavigationGridOptions {
  /**
   * The cells the grid has, an inclusive range of integer columns and rows.
   * Any integers, negative ones too, so a grid can have exactly the cells
   * of a tile layer, with the layer's cell numbers: pass
   * `getUsedRect(layer)`.
   */
  cells: GridCellRange;

  /**
   * Where the cells are, such as an orthogonal or isometric layout. The
   * grid measures its steps once, when it's created, so the layout must be
   * the linear map from cell space that every `GridLayout` is.
   */
  layout: GridLayout;

  /**
   * The world position of the corner of cell `(0, 0)` at the layout's
   * origin, whether or not `cells` holds `(0, 0)`: the top-left corner of
   * an orthogonal cell, the top corner of an isometric one. For a grid over
   * a tile layer, the layer's world position. Defaults to `(0, 0)`.
   */
  origin?: Vector2;

  /** Which diagonal steps are allowed. Defaults to `'noCornerCutting'`. */
  diagonals?: NavigationGridDiagonals;
}

/**
 * A fixed block of cells that are walkable or blocked, each with a
 * traversal cost, placed in the world by a `GridLayout`. Build one with
 * {@link createNavigationGrid}.
 *
 * **Coordinates.** The world is Y-down: columns increase towards `+X` and
 * rows towards `+Y`, down the screen. A world position is in the cell the
 * layout puts `position - origin` in. So a grid with a tile layer's layout,
 * its `origin` at the layer's world position and the layer's used cells as
 * its `cells` agrees with the layer on every cell, by position and by
 * number.
 *
 * **Graph.** The grid is a {@link NavigationGraph} whose node ids count its
 * cells in row-major order from the first,
 * `(row - cells.minRow) * columns + (column - cells.minColumn)`, so
 * {@link findPath} can search it;
 * {@link findGridPath} does that from world positions. A step goes to one
 * of the eight cells around a cell (four when `diagonals` is `'never'`)
 * and only ever into a walkable cell, including out of a blocked one, so a
 * search started inside a wall can step out of it. A step costs the cost
 * of the cell it enters times the world distance between the two cells'
 * centres: on square cells of size `s`, `s` times the cost for an
 * orthogonal step and `s√2` times the cost for a diagonal one. A path's
 * cost is therefore its world length, weighted by the cells it enters. The
 * heuristic is the cost of the shortest path on the same grid with no
 * blocked cells and every cell at the grid's lowest cost (Manhattan
 * distance for 4-way movement and octile distance for 8-way on square
 * cells), so it never overestimates.
 */
export interface NavigationGrid extends NavigationGraph {
  /** A copy of the inclusive range of cells the grid has. */
  readonly cells: GridCellRange;

  /** The number of columns, `cells.maxColumn - cells.minColumn + 1`. */
  readonly columns: number;

  /** The number of rows, `cells.maxRow - cells.minRow + 1`. */
  readonly rows: number;

  /** Where the cells are. */
  readonly layout: GridLayout;

  /** A copy of the world position of cell `(0, 0)`'s layout-origin corner. */
  readonly origin: Vector2;

  /** Which diagonal steps are allowed. */
  readonly diagonals: NavigationGridDiagonals;

  /**
   * Starts at `0` and increases by one after each call that changes at
   * least one cell's walkability or cost, so something holding a path can
   * tell the grid has changed since it searched. A call that changes
   * nothing, such as making a walkable cell walkable, leaves it alone.
   */
  readonly version: number;

  /**
   * Checks whether a cell is in the grid.
   * @param column - The cell's column.
   * @param row - The cell's row.
   * @returns `true` if `column` and `row` are integers inside `cells`.
   */
  hasCell(column: number, row: number): boolean;

  /**
   * Finds a cell's node id,
   * `(row - cells.minRow) * columns + (column - cells.minColumn)`.
   * @param column - The cell's column.
   * @param row - The cell's row.
   * @returns The node id.
   * @throws An error if the cell isn't in the grid.
   */
  cellToNode(column: number, row: number): number;

  /**
   * Finds the cell a node id stands for.
   * @param node - The node id.
   * @returns A new `GridCell`.
   * @throws An error if `node` isn't an integer from `0` to
   * `nodeCount - 1`.
   */
  nodeToCell(node: number): GridCell;

  /**
   * Finds the cell a world position is in. A position on an edge shared by
   * two cells is in the one the layout says owns it.
   * @param position - The world position.
   * @returns A new `GridCell`, or `null` if the position is outside the
   * grid.
   * @throws An error if the position isn't finite.
   */
  worldToCell(position: Vector2): GridCell | null;

  /**
   * Finds the world position of a cell's centre.
   * @param column - The cell's column.
   * @param row - The cell's row.
   * @returns A new `Vector2`.
   * @throws An error if the cell isn't in the grid.
   */
  cellToWorld(column: number, row: number): Vector2;

  /**
   * Checks whether a cell is walkable.
   * @param column - The cell's column.
   * @param row - The cell's row.
   * @returns `true` if a path can enter the cell.
   * @throws An error if the cell isn't in the grid.
   */
  isWalkable(column: number, row: number): boolean;

  /**
   * Reads a cell's traversal cost. A blocked cell keeps its cost, so
   * making it walkable again restores it.
   * @param column - The cell's column.
   * @param row - The cell's row.
   * @returns The cost, as stored in 32 bits.
   * @throws An error if the cell isn't in the grid.
   */
  getCost(column: number, row: number): number;

  /**
   * Makes a cell walkable or blocked.
   * @param column - The cell's column.
   * @param row - The cell's row.
   * @param walkable - Whether a path can enter the cell.
   * @throws An error if the cell isn't in the grid.
   */
  setWalkable(column: number, row: number, walkable: boolean): void;

  /**
   * Sets a cell's traversal cost: how much more entering it costs than a
   * cell of cost `1`, such as `3` for mud. It's stored as a 32-bit float.
   * @param column - The cell's column.
   * @param row - The cell's row.
   * @param cost - The cost, which must be finite and more than `0` as a
   * 32-bit float.
   * @throws An error if the cell isn't in the grid, or if `cost` isn't
   * finite and more than `0` as a 32-bit float.
   */
  setCost(column: number, row: number, cost: number): void;

  /**
   * Makes every cell of a range that's in the grid walkable or blocked.
   * The rest of the range is ignored, so a range hanging over the grid's
   * edge is fine.
   * @param range - The inclusive range of cells.
   * @param walkable - Whether a path can enter the cells.
   * @throws An error if the range's bounds aren't integers, or its min is
   * greater than its max.
   */
  fillWalkable(range: GridCellRange, walkable: boolean): void;

  /**
   * Makes every cell whose byte in `mask` isn't `0` walkable or blocked,
   * and leaves the rest alone, as one change: `version` increases at most
   * once. Byte `i` is the cell whose node id is `i` (see `cellToNode`).
   * Use it to write many cells worked out from
   * your own data, such as a level image, in one call.
   * @param mask - One byte per cell, `nodeCount` long.
   * @param walkable - Whether a path can enter the masked cells.
   * @throws An error if `mask.length` isn't `nodeCount`.
   */
  fillWalkableMask(mask: Uint8Array, walkable: boolean): void;

  /**
   * Sets the traversal cost of every cell of a range that's in the grid.
   * The rest of the range is ignored.
   * @param range - The inclusive range of cells.
   * @param cost - The cost, which must be finite and more than `0` as a
   * 32-bit float.
   * @throws An error if the range's bounds aren't integers, its min is
   * greater than its max, or `cost` isn't finite and more than `0` as a
   * 32-bit float.
   */
  fillCost(range: GridCellRange, cost: number): void;
}
