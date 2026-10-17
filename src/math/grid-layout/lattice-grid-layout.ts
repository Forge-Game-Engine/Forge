import { Rect } from '../rect.js';
import { Vector2 } from '../vector2.js';
import { GridCell, GridCellRange, GridLayout } from './grid-layout.js';

/**
 * Throws if a cell size isn't a positive finite number.
 * @param factoryName - The name of the factory checking it, for the message.
 * @param optionName - The name of the option, for the message.
 * @param value - The cell size.
 * @throws An error if `value` isn't a positive finite number.
 */
export function assertCellSize(
  factoryName: string,
  optionName: string,
  value: number,
): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(
      `${factoryName}: ${optionName} must be a positive finite number, received ${value}.`,
    );
  }
}

/**
 * A grid layout that's a linear map of a square grid: cell space maps to
 * local space through one step along a column and one step along a row.
 * Orthogonal and isometric layouts are both this map with different steps,
 * so they share every formula.
 */
export class LatticeGridLayout implements GridLayout {
  public readonly cellWidth: number;
  public readonly cellHeight: number;

  private readonly _columnStep: Vector2;
  private readonly _rowStep: Vector2;
  private readonly _determinant: number;

  /**
   * Creates a lattice grid layout. The steps must turn `+X` towards `+Y`
   * (a positive determinant), so the map keeps winding.
   * @param cellWidth - The width of a cell's footprint bounds.
   * @param cellHeight - The height of a cell's footprint bounds.
   * @param columnStep - The local-space offset of one column.
   * @param rowStep - The local-space offset of one row.
   */
  constructor(
    cellWidth: number,
    cellHeight: number,
    columnStep: Vector2,
    rowStep: Vector2,
  ) {
    this.cellWidth = cellWidth;
    this.cellHeight = cellHeight;
    this._columnStep = { x: columnStep.x, y: columnStep.y };
    this._rowStep = { x: rowStep.x, y: rowStep.y };
    this._determinant = columnStep.x * rowStep.y - columnStep.y * rowStep.x;
  }

  public getCellCenter(column: number, row: number): Vector2 {
    return this._toLocal(column + 0.5, row + 0.5);
  }

  public localToCell(point: Vector2): GridCell {
    if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) {
      throw new Error(
        `Unable to find the cell containing (${point.x}, ${point.y}), the point isn't finite.`,
      );
    }

    const cellSpacePoint = this.localToCellSpace(point);

    // Adding 0 turns the -0 that Math.floor keeps into 0.
    return {
      column: Math.floor(cellSpacePoint.x) + 0,
      row: Math.floor(cellSpacePoint.y) + 0,
    };
  }

  public localToCellSpace(point: Vector2): Vector2 {
    // Multiply first and divide once, last: the steps are the cell sizes and
    // their halves, so for integer inputs every product and sum is exact and
    // a point on a cell edge maps to an exact integer, which then floors to
    // the cell that owns the edge.
    const x =
      (point.x * this._rowStep.y - point.y * this._rowStep.x) /
      this._determinant;
    const y =
      (point.y * this._columnStep.x - point.x * this._columnStep.y) /
      this._determinant;

    return { x: x + 0, y: y + 0 };
  }

  public cellSpaceToLocal(point: Vector2): Vector2 {
    return this._toLocal(point.x, point.y);
  }

  public getCellPolygon(column: number, row: number): Vector2[] {
    // Each corner comes from its integer cell-space position through the
    // same expression, so neighbors' shared corners are equal and meshes
    // built from adjacent cells have no cracks.
    return [
      this._toLocal(column, row),
      this._toLocal(column + 1, row),
      this._toLocal(column + 1, row + 1),
      this._toLocal(column, row + 1),
    ];
  }

  public getCellFootprintBounds(column: number, row: number): Rect {
    const corners = this.getCellPolygon(column, row);
    const xs = corners.map((corner) => corner.x);
    const ys = corners.map((corner) => corner.y);

    return {
      min: { x: Math.min(...xs), y: Math.min(...ys) },
      max: { x: Math.max(...xs), y: Math.max(...ys) },
    };
  }

  public getCellRangeForLocalRect(rect: Rect): GridCellRange {
    const { min, max } = rect;

    if (
      !Number.isFinite(min.x) ||
      !Number.isFinite(min.y) ||
      !Number.isFinite(max.x) ||
      !Number.isFinite(max.y)
    ) {
      throw new Error(
        `Unable to find the cells in the rect from (${min.x}, ${min.y}) to (${max.x}, ${max.y}), the rect isn't finite.`,
      );
    }

    if (min.x > max.x || min.y > max.y) {
      throw new Error(
        `Unable to find the cells in the rect from (${min.x}, ${min.y}) to (${max.x}, ${max.y}), its min is greater than its max.`,
      );
    }

    // The map is linear, so the rect's extremes in cell space are at its
    // corners.
    const corners = [
      this.localToCellSpace(min),
      this.localToCellSpace({ x: max.x, y: min.y }),
      this.localToCellSpace(max),
      this.localToCellSpace({ x: min.x, y: max.y }),
    ];
    const columns = corners.map((corner) => corner.x);
    const rows = corners.map((corner) => corner.y);

    return {
      minColumn: Math.floor(Math.min(...columns)) + 0,
      minRow: Math.floor(Math.min(...rows)) + 0,
      maxColumn: Math.floor(Math.max(...columns)) + 0,
      maxRow: Math.floor(Math.max(...rows)) + 0,
    };
  }

  private _toLocal(column: number, row: number): Vector2 {
    const x = column * this._columnStep.x + row * this._rowStep.x;
    const y = column * this._columnStep.y + row * this._rowStep.y;

    // Adding 0 turns -0 into 0.
    return { x: x + 0, y: y + 0 };
  }
}
