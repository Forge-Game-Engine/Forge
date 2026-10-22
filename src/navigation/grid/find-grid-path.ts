import { GridCell } from '../../math/grid-layout/grid-layout.js';
import { Vector2 } from '../../math/vector2.js';
import { withDefaults } from '../../utilities/with-defaults.js';
import { findPath, FindPathOptions, FindPathResult } from '../find-path.js';
import { NavigationGrid } from './navigation-grid.js';
import { snapToWalkableCell } from './snap-to-walkable-cell.js';

/** Options for {@link findGridPath}. */
export interface FindGridPathOptions extends FindPathOptions {
  /**
   * How many rings of cells around a blocked or out-of-grid start or goal
   * to look through for a walkable cell, a non-negative integer. Defaults
   * to `2`. `0` never moves either end into another cell.
   */
  snapRadius?: number;
}

/** The result of {@link findGridPath}. */
export interface FindGridPathResult extends FindPathResult {
  /**
   * The world position of the centre of each cell in `nodes`, in the same
   * order, from `startCell` to the path's last cell.
   */
  readonly points: Vector2[];

  /** The cell the search started from. */
  readonly startCell: GridCell;

  /** The cell the search looked for. */
  readonly goalCell: GridCell;

  /** `true` when `startCell` isn't the cell `fromWorld` is in. */
  readonly startSnapped: boolean;

  /** `true` when `goalCell` isn't the cell `toWorld` is in. */
  readonly goalSnapped: boolean;
}

const defaultFindGridPathOptions = { snapRadius: 2 };

const assertFinitePosition = (name: string, position: Vector2): void => {
  if (!Number.isFinite(position.x) || !Number.isFinite(position.y)) {
    throw new Error(
      `Unable to find a grid path, ${name} (${position.x}, ${position.y}) isn't finite.`,
    );
  }
};

/**
 * Finds the cheapest path across a navigation grid between two world
 * positions, as cell centres.
 *
 * A start or goal in a blocked cell, or outside the grid, moves to the
 * walkable cell nearest it in the nearest ring of cells around it (a
 * position outside the grid starts from the grid's nearest edge cell), up
 * to `snapRadius` rings out, and the result's `startSnapped` or
 * `goalSnapped` says so. A unit standing slightly inside a wall still gets
 * a path. When no walkable cell is close enough the end stays where it is:
 * a blocked goal gives an `'unreachable'` path towards it, and a blocked
 * start can still step out into a walkable neighbor.
 * @param grid - The grid to search.
 * @param fromWorld - The world position to start from.
 * @param toWorld - The world position to find a path to.
 * @param options - Options for the search.
 * @returns How the search ended, the path's cells and their centres, its
 * cost, how many cells it expanded, and the cells it searched between.
 * @throws An error if either position isn't finite, if `snapRadius` isn't
 * a non-negative integer, or for any reason {@link findPath} throws.
 */
export const findGridPath = (
  grid: NavigationGrid,
  fromWorld: Vector2,
  toWorld: Vector2,
  options?: FindGridPathOptions,
): FindGridPathResult => {
  const { snapRadius, maxExpanded } = withDefaults(
    defaultFindGridPathOptions,
    options,
  );

  assertFinitePosition('fromWorld', fromWorld);
  assertFinitePosition('toWorld', toWorld);

  if (!Number.isInteger(snapRadius) || snapRadius < 0) {
    throw new Error(
      `Unable to find a grid path with snapRadius ${snapRadius}, it must be an integer of at least 0.`,
    );
  }

  const start = snapToWalkableCell(grid, fromWorld, snapRadius);
  const goal = snapToWalkableCell(grid, toWorld, snapRadius);
  const result = findPath(
    grid,
    grid.cellToNode(start.cell.column, start.cell.row),
    grid.cellToNode(goal.cell.column, goal.cell.row),
    { maxExpanded },
  );
  const points = result.nodes.map((node) => {
    const { column, row } = grid.nodeToCell(node);

    return grid.cellToWorld(column, row);
  });

  return {
    ...result,
    points,
    startCell: start.cell,
    goalCell: goal.cell,
    startSnapped: start.snapped,
    goalSnapped: goal.snapped,
  };
};
