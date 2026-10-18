import { Rect } from '../rect.js';
import { Vector2 } from '../vector2.js';

/**
 * A cell of a grid, by its integer column and row.
 */
export interface GridCell {
  /** The cell's column. Columns increase towards `+X`. */
  column: number;

  /** The cell's row. Rows increase towards `+Y`, down the screen. */
  row: number;
}

/**
 * An inclusive range of cells: every cell with a column from `minColumn` to
 * `maxColumn` and a row from `minRow` to `maxRow`, bounds included.
 */
export interface GridCellRange {
  /** The smallest column in the range. */
  minColumn: number;

  /** The smallest row in the range. */
  minRow: number;

  /** The largest column in the range, included. */
  maxColumn: number;

  /** The largest row in the range, included. */
  maxRow: number;
}

/**
 * Where the cells of an unbounded grid are in local space, and which cell a
 * point is in. A layout holds no cells: tile layers and navigation grids
 * store their cells and take a `GridLayout` to place them, so two of them
 * built from the same layout agree on every cell. Create one with
 * {@link createOrthogonalGridLayout} or {@link createIsometricGridLayout}.
 *
 * Local space is Y-down like the rest of the engine: `+X` is right and `+Y`
 * is down the screen. Columns increase towards `+X` and rows towards `+Y`.
 *
 * **Cell space.** A layout is a linear map between local space and cell
 * space, in which cell `(c, r)` is the unit square `[c, c + 1) x [r, r + 1)`
 * and the cell-space origin is the local origin. Straight lines stay
 * straight and the map keeps winding, so a polygon's vertices can be mapped
 * into cell space and the polygon rasterized there against unit squares.
 *
 * **Ownership.** Every point is in exactly one cell: the one whose half-open
 * square holds it in cell space. An orthogonal cell owns its top and left
 * edges and its top-left corner; an isometric cell owns its top-left and
 * top-right edges and its top corner.
 *
 * **Draw order.** Drawing cells in row-major order (rows ascending, then
 * columns ascending) is back to front: of two cells whose images overlap,
 * the one whose footprint is lower on the screen draws later. So is any
 * order that draws a cell after every cell whose column and row are both
 * less than or equal to its own, such as fixed-size chunks in row-major
 * order of their chunk coordinates, each chunk's cells in row-major order.
 * This holds when each cell's image is at most `cellWidth` wide, has its left
 * edge on the left edge of the cell's footprint bounds, and doesn't reach
 * below the bottom of the footprint bounds. It can reach up by any amount.
 */
export interface GridLayout {
  /**
   * The width of a cell's footprint bounds, in local units. For an
   * isometric layout, the diamond's full width.
   */
  readonly cellWidth: number;

  /**
   * The height of a cell's footprint bounds, in local units. For an
   * isometric layout, the diamond's full height.
   */
  readonly cellHeight: number;

  /**
   * Finds the center of a cell's footprint.
   * @param column - The cell's integer column. Use `cellSpaceToLocal` for a
   * continuous position.
   * @param row - The cell's integer row.
   * @returns A new `Vector2` holding the center, in local space.
   */
  getCellCenter(column: number, row: number): Vector2;

  /**
   * Finds the cell that contains a point. It floors the point's cell-space
   * position, so it works for negative coordinates, and a point on an edge
   * or corner is in the one cell that owns it (see {@link GridLayout}).
   * Points on edges land exactly for integer coordinates and cell sizes;
   * other inputs are accurate to two rounding steps.
   * @param point - The point, in local space.
   * @returns The cell containing the point.
   * @throws An error if the point isn't finite.
   */
  localToCell(point: Vector2): GridCell;

  /**
   * Converts a point from local space to continuous cell space, where cell
   * `(c, r)` is the unit square `[c, c + 1) x [r, r + 1)`.
   * @param point - The point, in local space.
   * @returns A new `Vector2` holding the point in cell space.
   */
  localToCellSpace(point: Vector2): Vector2;

  /**
   * Converts a point from continuous cell space to local space, the inverse
   * of `localToCellSpace`.
   * @param point - The point, in cell space.
   * @returns A new `Vector2` holding the point in local space.
   */
  cellSpaceToLocal(point: Vector2): Vector2;

  /**
   * Finds the four corners of a cell's footprint, the cell-space corners
   * `(c, r)`, `(c + 1, r)`, `(c + 1, r + 1)` and `(c, r + 1)` in local
   * space. They start at the top-left corner of an orthogonal cell and the
   * top corner of an isometric one, and turn clockwise on screen, so the
   * polygon's signed area is positive. Neighboring cells' shared corners are
   * equal.
   * @param column - The cell's integer column.
   * @param row - The cell's integer row.
   * @returns A new array of four new `Vector2`s, in local space.
   */
  getCellPolygon(column: number, row: number): Vector2[];

  /**
   * Finds the axis-aligned bounds of a cell's footprint.
   * @param column - The cell's integer column.
   * @param row - The cell's integer row.
   * @returns A new `Rect` holding the bounds, in local space.
   */
  getCellFootprintBounds(column: number, row: number): Rect;

  /**
   * Finds the smallest range of cells holding every cell that contains a
   * point of a rectangle, edges and corners included, for culling and
   * rasterization. For an isometric layout the cells a rectangle reaches
   * form a diamond of indices, so the range also holds cells the rectangle
   * doesn't reach. Map the rectangle into cell space to find the exact set.
   * @param rect - The rectangle, in local space.
   * @returns The inclusive range of cells.
   * @throws An error if the rectangle isn't finite or its `min` is greater
   * than its `max` on either axis.
   */
  getCellRangeForLocalRect(rect: Rect): GridCellRange;
}
