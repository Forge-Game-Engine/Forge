import { Vector2 } from '../math/vector2.js';
import { FindPathOptions, PathStatus } from './find-path.js';

/** A path between two world positions, from {@link PathPlanner.planPath}. */
export interface PlannedPath {
  /** How the search ended, as {@link findPath} reports it. */
  readonly status: PathStatus;

  /**
   * The world positions to walk through, starting at `fromWorld`. For
   * `'found'` it ends at `toWorld` when a unit can walk to it, and at the
   * nearest place it can reach otherwise (a snapped goal's cell centre).
   * For `'unreachable'` and `'limitReached'` it ends where the search got
   * closest. Empty when there's nothing to walk at all, such as a waypoint
   * graph with no enabled point, and for `'limitReached'` when
   * `keepPartialPath` was `false`. Every position is a new object.
   */
  readonly points: Vector2[];

  /** How many nodes the search expanded, counted against a budget. */
  readonly expanded: number;
}

/** Options for {@link PathPlanner.planPath}. */
export interface PlanPathOptions extends FindPathOptions {
  /**
   * Whether a search that stops at `maxExpanded` still builds the path it
   * got to. `false` returns `'limitReached'` with empty `points` without
   * building the path's ends or smoothing it, for a caller that will plan
   * again instead of walking a partial path. Defaults to `true`.
   */
  keepPartialPath?: boolean;
}

/**
 * Plans paths between world positions over one navigation graph, for a
 * navigation agent or for game code. Create one with
 * {@link createGridPathPlanner} or {@link createWaypointPathPlanner}, or
 * implement it for a graph of your own.
 */
export interface PathPlanner {
  /**
   * Changes whenever a path planned before might differ from one planned
   * now: the wrapped graph's `version`.
   */
  readonly version: number;

  /**
   * How far a unit may be from the segment of its path it's walking before
   * its path is planned again, in world units: `Infinity` never re-plans
   * for that. A navigation agent allows at least its own `arrivalRadius`,
   * since it turns onto the next segment that far from a corner.
   */
  readonly maxPathDistance: number;

  /**
   * Plans a path.
   * @param fromWorld - Where the unit is.
   * @param toWorld - Where it's going.
   * @param options - The most nodes the search may expand, and whether a
   * path cut short by that limit is built.
   * @returns The path and how the search ended.
   * @throws An error if either position isn't finite, or for any reason the
   * wrapped search throws.
   */
  planPath(
    fromWorld: Vector2,
    toWorld: Vector2,
    options?: PlanPathOptions,
  ): PlannedPath;
}
