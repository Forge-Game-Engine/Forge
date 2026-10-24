import { Vector2 } from '../../math/vector2.js';
import { withDefaults } from '../../utilities/with-defaults.js';
import { assertMaxPathDistance, buildAgentPath } from '../agent-path.js';
import { PathPlanner, PlannedPath, PlanPathOptions } from '../path-planner.js';
import { findGridPath } from './find-grid-path.js';
import { NavigationGrid } from './navigation-grid.js';
import { smoothGridPath } from './smooth-grid-path.js';

/** Options for {@link createGridPathPlanner}. */
export interface GridPathPlannerOptions {
  /**
   * Whether paths are smoothed with {@link smoothGridPath} into straight
   * segments between the corners they turn at. `false` walks from cell
   * centre to cell centre, as a game whose units move cell by cell wants.
   * Defaults to `true`.
   */
  smooth?: boolean;

  /** Passed to {@link findGridPath}. Defaults to `2`. */
  snapRadius?: number;

  /**
   * See {@link PathPlanner.maxPathDistance}. Defaults to one cell: the
   * longer of the world lengths of a step of one column and of one row.
   */
  maxPathDistance?: number;
}

const defaultGridPathPlannerOptions = {
  smooth: true,
  snapRadius: 2,
};

const defaultPlanPathOptions = {
  maxExpanded: Infinity,
  keepPartialPath: true,
};

/**
 * Measures one cell of a grid: the longer of the world lengths of a step
 * of one column and of one row.
 * @param grid - The grid.
 * @returns The length, in world units.
 */
const measureCell = (grid: NavigationGrid): number => {
  const { layout } = grid;
  const origin = layout.cellSpaceToLocal({ x: 0, y: 0 });
  const column = layout.cellSpaceToLocal({ x: 1, y: 0 });
  const row = layout.cellSpaceToLocal({ x: 0, y: 1 });

  return Math.max(
    Math.hypot(column.x - origin.x, column.y - origin.y),
    Math.hypot(row.x - origin.x, row.y - origin.y),
  );
};

/**
 * Creates a path planner over a navigation grid. It finds a path with
 * {@link findGridPath}, starts it at the unit's own position, ends it at
 * the target when the target's own cell is walkable and the search reached
 * it, and smooths it with {@link smoothGridPath} unless `smooth` is
 * `false`. A smoothed path runs straight from the unit to the target
 * across open ground.
 *
 * A target inside a wall, or off the grid, within `snapRadius` cells of a
 * walkable cell gives a `'found'` path that ends at that cell's centre,
 * never inside the wall.
 * @param grid - The grid to plan over. Its `version` is the planner's.
 * @param options - Whether to smooth paths, how far to snap a blocked end,
 * and how far a unit may drift from its path.
 * @returns The planner.
 * @throws An error if `snapRadius` isn't a non-negative integer, or
 * `maxPathDistance` isn't more than `0`.
 */
export function createGridPathPlanner(
  grid: NavigationGrid,
  options?: GridPathPlannerOptions,
): PathPlanner {
  const { smooth, snapRadius, maxPathDistance } = withDefaults(
    { ...defaultGridPathPlannerOptions, maxPathDistance: measureCell(grid) },
    options,
  );

  if (!Number.isInteger(snapRadius) || snapRadius < 0) {
    throw new Error(
      `createGridPathPlanner: snapRadius must be an integer of at least 0, received ${snapRadius}.`,
    );
  }

  assertMaxPathDistance('createGridPathPlanner', maxPathDistance);

  return {
    get version(): number {
      return grid.version;
    },
    maxPathDistance,
    planPath: (
      fromWorld: Vector2,
      toWorld: Vector2,
      planOptions?: PlanPathOptions,
    ): PlannedPath => {
      const { maxExpanded, keepPartialPath } = withDefaults(
        defaultPlanPathOptions,
        planOptions,
      );
      const result = findGridPath(grid, fromWorld, toWorld, {
        maxExpanded,
        snapRadius,
      });
      const { status, expanded } = result;

      if (status === 'limitReached' && !keepPartialPath) {
        return { status, points: [], expanded };
      }

      const points = buildAgentPath(
        fromWorld,
        result.points,
        toWorld,
        status === 'found' && !result.goalSnapped,
      );

      return {
        status,
        points: smooth ? smoothGridPath(grid, points) : points,
        expanded,
      };
    },
  };
}
