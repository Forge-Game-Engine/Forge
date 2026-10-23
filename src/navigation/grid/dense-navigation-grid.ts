import {
  GridCell,
  GridCellRange,
  GridLayout,
} from '../../math/grid-layout/grid-layout.js';
import { Vector2 } from '../../math/vector2.js';
import {
  createGridMetric,
  getGridDistance,
  GridMetric,
} from './grid-metric.js';
import { NavigationGrid, NavigationGridDiagonals } from './navigation-grid.js';

/** A step's cell offset: `[columnOffset, rowOffset]`. */
type StepOffset = readonly [columnOffset: number, rowOffset: number];

const orthogonalOffsets: readonly StepOffset[] = [
  [1, 0],
  [0, 1],
  [-1, 0],
  [0, -1],
];

const diagonalOffsets: readonly StepOffset[] = [
  [1, 1],
  [-1, 1],
  [-1, -1],
  [1, -1],
];

/**
 * Throws if a cost isn't finite and more than `0` once stored as a 32-bit
 * float, so a value that underflows to `0` or overflows to `Infinity` is
 * never stored.
 * @param cost - The cost.
 * @returns The cost as a 32-bit float.
 * @throws An error if the cost isn't valid.
 */
const toStoredCost = (cost: number): number => {
  const stored = Math.fround(cost);

  if (!Number.isFinite(stored) || stored <= 0) {
    throw new Error(
      `Unable to set a navigation grid cell's cost to ${cost}, it must be finite and more than 0 as a 32-bit float.`,
    );
  }

  return stored;
};

/**
 * A navigation grid over flat typed arrays: one byte per cell for
 * walkability and a 32-bit float per cell for its cost. Inside, a cell is
 * found by its column and row counted from the grid's first cell, so the
 * neighbor walk and the heuristic never see the grid's own cell numbers.
 */
export class DenseNavigationGrid implements NavigationGrid {
  public readonly columns: number;
  public readonly rows: number;
  public readonly nodeCount: number;
  public readonly layout: GridLayout;
  public readonly diagonals: NavigationGridDiagonals;

  private readonly _cells: GridCellRange;
  private readonly _origin: Vector2;
  private readonly _metric: GridMetric;
  private readonly _walkable: Uint8Array;
  private readonly _cost: Float32Array;
  private readonly _orthogonalLengths: readonly number[];
  private readonly _diagonalLengths: readonly number[];
  private _version: number;

  // The lowest cost of any cell, blocked ones included, which scales the
  // heuristic so it never overestimates. Raising the cheapest cell marks it
  // stale instead of rescanning, so a bake that sets every cell's cost
  // doesn't scan the grid once per cell; the next heuristic call rescans.
  private _minCost: number;
  private _isMinCostStale: boolean;

  /**
   * Creates a navigation grid with every cell walkable and costing `1`.
   * The arguments are checked by `createNavigationGrid`.
   * @param cells - The inclusive range of cells the grid has.
   * @param layout - Where the cells are.
   * @param origin - The world position of cell `(0, 0)`'s layout-origin
   * corner.
   * @param diagonals - Which diagonal steps are allowed.
   */
  constructor(
    cells: GridCellRange,
    layout: GridLayout,
    origin: Vector2,
    diagonals: NavigationGridDiagonals,
  ) {
    this.columns = cells.maxColumn - cells.minColumn + 1;
    this.rows = cells.maxRow - cells.minRow + 1;
    this.nodeCount = this.columns * this.rows;
    this.layout = layout;
    this.diagonals = diagonals;
    this._cells = {
      minColumn: cells.minColumn,
      minRow: cells.minRow,
      maxColumn: cells.maxColumn,
      maxRow: cells.maxRow,
    };
    this._origin = { x: origin.x, y: origin.y };
    this._metric = createGridMetric(layout);
    this._walkable = new Uint8Array(this.nodeCount).fill(1);
    this._cost = new Float32Array(this.nodeCount).fill(1);
    this._orthogonalLengths = [
      this._metric.columnLength,
      this._metric.rowLength,
      this._metric.columnLength,
      this._metric.rowLength,
    ];
    this._diagonalLengths = [
      this._metric.sameSignDiagonalLength,
      this._metric.oppositeSignDiagonalLength,
      this._metric.sameSignDiagonalLength,
      this._metric.oppositeSignDiagonalLength,
    ];
    this._version = 0;
    this._minCost = 1;
    this._isMinCostStale = false;
  }

  get cells(): GridCellRange {
    return { ...this._cells };
  }

  get origin(): Vector2 {
    return { x: this._origin.x, y: this._origin.y };
  }

  get version(): number {
    return this._version;
  }

  public hasCell(column: number, row: number): boolean {
    const { minColumn, minRow, maxColumn, maxRow } = this._cells;

    return (
      Number.isInteger(column) &&
      Number.isInteger(row) &&
      column >= minColumn &&
      column <= maxColumn &&
      row >= minRow &&
      row <= maxRow
    );
  }

  public cellToNode(column: number, row: number): number {
    return this._getIndex('find the node of', column, row);
  }

  public nodeToCell(node: number): GridCell {
    if (!Number.isInteger(node) || node < 0 || node >= this.nodeCount) {
      throw new Error(
        `Unable to find the cell of node ${node}, it must be an integer from 0 to ${this.nodeCount - 1}.`,
      );
    }

    const row = Math.floor(node / this.columns);

    return {
      column: node - row * this.columns + this._cells.minColumn,
      row: row + this._cells.minRow,
    };
  }

  public worldToCell(position: Vector2): GridCell | null {
    if (!Number.isFinite(position.x) || !Number.isFinite(position.y)) {
      throw new Error(
        `Unable to find the navigation grid cell at (${position.x}, ${position.y}), the position isn't finite.`,
      );
    }

    const cell = this.layout.localToCell({
      x: position.x - this._origin.x,
      y: position.y - this._origin.y,
    });

    return this.hasCell(cell.column, cell.row) ? cell : null;
  }

  public cellToWorld(column: number, row: number): Vector2 {
    this._getIndex('find the centre of', column, row);

    const center = this.layout.getCellCenter(column, row);

    return { x: center.x + this._origin.x, y: center.y + this._origin.y };
  }

  public isWalkable(column: number, row: number): boolean {
    return (
      this._walkable[this._getIndex('read the walkability of', column, row)] ===
      1
    );
  }

  public getCost(column: number, row: number): number {
    return this._cost[this._getIndex('read the cost of', column, row)];
  }

  public setWalkable(column: number, row: number, walkable: boolean): void {
    const index = this._getIndex('set the walkability of', column, row);

    if (this._writeWalkable(index, walkable)) {
      this._version++;
    }
  }

  public setCost(column: number, row: number, cost: number): void {
    const index = this._getIndex('set the cost of', column, row);

    if (this._writeCost(index, toStoredCost(cost))) {
      this._version++;
    }
  }

  public fillWalkable(range: GridCellRange, walkable: boolean): void {
    if (this._fill(range, (index) => this._writeWalkable(index, walkable))) {
      this._version++;
    }
  }

  public fillWalkableMask(mask: Uint8Array, walkable: boolean): void {
    if (mask.length !== this.nodeCount) {
      throw new Error(
        `Unable to fill the navigation grid cells from a mask of ${mask.length} bytes, it must have one byte per cell, ${this.nodeCount}.`,
      );
    }

    let changed = false;

    for (let index = 0; index < mask.length; index++) {
      if (mask[index] !== 0) {
        changed = this._writeWalkable(index, walkable) || changed;
      }
    }

    if (changed) {
      this._version++;
    }
  }

  public fillCost(range: GridCellRange, cost: number): void {
    const stored = toStoredCost(cost);

    if (this._fill(range, (index) => this._writeCost(index, stored))) {
      this._version++;
    }
  }

  public setCosts(costs: Float32Array): void {
    if (costs.length !== this.nodeCount) {
      throw new Error(
        `Unable to set the navigation grid's costs from an array of ${costs.length} costs, it must have one cost per cell, ${this.nodeCount}.`,
      );
    }

    let minCost = Infinity;
    let changed = false;

    for (let index = 0; index < costs.length; index++) {
      const cost = costs[index];

      if (!Number.isFinite(cost) || cost <= 0) {
        const { column, row } = this.nodeToCell(index);

        throw new Error(
          `Unable to set the navigation grid's costs: entry ${index}, for cell (${column}, ${row}), is ${cost}, and a cost must be finite and more than 0.`,
        );
      }

      minCost = Math.min(minCost, cost);
      changed = changed || cost !== this._cost[index];
    }

    if (!changed) {
      return;
    }

    this._cost.set(costs);
    this._minCost = minCost;
    this._isMinCostStale = false;
    this._version++;
  }

  public forEachNeighbor(
    node: number,
    visit: (neighbor: number, cost: number) => void,
  ): void {
    const row = Math.floor(node / this.columns);
    const column = node - row * this.columns;

    for (let i = 0; i < orthogonalOffsets.length; i++) {
      const [columnOffset, rowOffset] = orthogonalOffsets[i];
      const neighbor = this._getWalkableIndex(
        column + columnOffset,
        row + rowOffset,
      );

      if (neighbor !== -1) {
        visit(neighbor, this._cost[neighbor] * this._orthogonalLengths[i]);
      }
    }

    if (this.diagonals === 'never') {
      return;
    }

    for (let i = 0; i < diagonalOffsets.length; i++) {
      const [columnOffset, rowOffset] = diagonalOffsets[i];
      const neighbor = this._getWalkableIndex(
        column + columnOffset,
        row + rowOffset,
      );

      if (
        neighbor !== -1 &&
        this._isDiagonalOpen(column, row, columnOffset, rowOffset)
      ) {
        visit(neighbor, this._cost[neighbor] * this._diagonalLengths[i]);
      }
    }
  }

  public heuristic(node: number, goal: number): number {
    const nodeRow = Math.floor(node / this.columns);
    const goalRow = Math.floor(goal / this.columns);
    const columnOffset =
      goal - goalRow * this.columns - (node - nodeRow * this.columns);

    return (
      this._getMinCost() *
      getGridDistance(
        this._metric,
        columnOffset,
        goalRow - nodeRow,
        this.diagonals !== 'never',
      )
    );
  }

  /**
   * Finds a cell's index, throwing if the cell isn't in the grid.
   * @param action - What the caller was doing, for the message.
   * @param column - The cell's column.
   * @param row - The cell's row.
   * @returns The cell's index.
   * @throws An error if the cell isn't in the grid.
   */
  private _getIndex(action: string, column: number, row: number): number {
    if (!this.hasCell(column, row)) {
      const { minColumn, minRow, maxColumn, maxRow } = this._cells;

      throw new Error(
        `Unable to ${action} navigation grid cell (${column}, ${row}), it isn't in the grid, which has integer columns from ${minColumn} to ${maxColumn} and rows from ${minRow} to ${maxRow}.`,
      );
    }

    return (
      (row - this._cells.minRow) * this.columns +
      (column - this._cells.minColumn)
    );
  }

  /**
   * Finds the index of a cell a step can enter.
   * @param column - The cell's integer column, counted from the first one.
   * @param row - The cell's integer row, counted from the first one.
   * @returns The cell's index, or `-1` if it's outside the grid or blocked.
   */
  private _getWalkableIndex(column: number, row: number): number {
    if (column < 0 || column >= this.columns || row < 0 || row >= this.rows) {
      return -1;
    }

    const index = row * this.columns + column;

    return this._walkable[index] === 1 ? index : -1;
  }

  /**
   * Checks the corner-cutting rule for a diagonal step into a walkable
   * cell. Both cells it passes between are in the grid whenever the cell
   * it enters is.
   * @param column - The column stepped from, counted from the first one.
   * @param row - The row stepped from, counted from the first one.
   * @param columnOffset - The step's column offset.
   * @param rowOffset - The step's row offset.
   * @returns `true` if the step is allowed.
   */
  private _isDiagonalOpen(
    column: number,
    row: number,
    columnOffset: number,
    rowOffset: number,
  ): boolean {
    if (this.diagonals === 'always') {
      return true;
    }

    return (
      this._walkable[row * this.columns + column + columnOffset] === 1 &&
      this._walkable[(row + rowOffset) * this.columns + column] === 1
    );
  }

  private _getMinCost(): number {
    if (this._isMinCostStale) {
      let minCost = Infinity;

      for (const cost of this._cost) {
        minCost = Math.min(minCost, cost);
      }

      this._minCost = minCost;
      this._isMinCostStale = false;
    }

    return this._minCost;
  }

  /**
   * Writes a cell's walkability.
   * @param index - The cell's index.
   * @param walkable - Whether a path can enter the cell.
   * @returns `true` if the value changed.
   */
  private _writeWalkable(index: number, walkable: boolean): boolean {
    const value = walkable ? 1 : 0;

    if (this._walkable[index] === value) {
      return false;
    }

    this._walkable[index] = value;

    return true;
  }

  /**
   * Writes a cell's cost and keeps the lowest cost up to date.
   * @param index - The cell's index.
   * @param cost - The cost, already a valid 32-bit float.
   * @returns `true` if the value changed.
   */
  private _writeCost(index: number, cost: number): boolean {
    const previous = this._cost[index];

    if (previous === cost) {
      return false;
    }

    this._cost[index] = cost;

    if (this._isMinCostStale) {
      return true;
    }

    if (cost < this._minCost) {
      this._minCost = cost;
    } else if (previous === this._minCost) {
      this._isMinCostStale = true;
    }

    return true;
  }

  /**
   * Writes every cell of a range that's in the grid.
   * @param range - The inclusive range of cells.
   * @param write - Writes one cell by index, returning `true` if it changed.
   * @returns `true` if any cell changed.
   * @throws An error if the range's bounds aren't integers, or its min is
   * greater than its max.
   */
  private _fill(
    range: GridCellRange,
    write: (index: number) => boolean,
  ): boolean {
    const { minColumn, minRow, maxColumn, maxRow } = range;

    if (
      !Number.isInteger(minColumn) ||
      !Number.isInteger(minRow) ||
      !Number.isInteger(maxColumn) ||
      !Number.isInteger(maxRow)
    ) {
      throw new Error(
        `Unable to fill the navigation grid cells from (${minColumn}, ${minRow}) to (${maxColumn}, ${maxRow}), the range's bounds must be integers.`,
      );
    }

    if (minColumn > maxColumn || minRow > maxRow) {
      throw new Error(
        `Unable to fill the navigation grid cells from (${minColumn}, ${minRow}) to (${maxColumn}, ${maxRow}), its min is greater than its max.`,
      );
    }

    // Clipped to the grid and counted from its first cell.
    const cells = this._cells;
    const firstColumn = Math.max(minColumn, cells.minColumn) - cells.minColumn;
    const lastColumn = Math.min(maxColumn, cells.maxColumn) - cells.minColumn;
    const firstRow = Math.max(minRow, cells.minRow) - cells.minRow;
    const lastRow = Math.min(maxRow, cells.maxRow) - cells.minRow;
    let changed = false;

    for (let row = firstRow; row <= lastRow; row++) {
      for (let column = firstColumn; column <= lastColumn; column++) {
        changed = write(row * this.columns + column) || changed;
      }
    }

    return changed;
  }
}
