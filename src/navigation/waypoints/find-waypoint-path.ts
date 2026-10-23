import { Vector2 } from '../../math/vector2.js';
import { findPath, FindPathOptions, FindPathResult } from '../find-path.js';
import { WaypointGraph } from './waypoint-graph.js';

/**
 * The result of {@link findWaypointPath}.
 *
 * When the graph has no enabled point there is nothing to search from:
 * `status` is `'unreachable'`, `nodes` and `points` are empty, `cost` and
 * `expanded` are `0`, and both point ids are `null`. That's the one result
 * whose `nodes` doesn't start at a start node, so treat an empty `nodes` as
 * "no route".
 */
export interface FindWaypointPathResult extends FindPathResult {
  /**
   * The world position of each point in `nodes`, in the same order, from
   * `startPointId` to the route's last point: `points[i]` is the position
   * of `nodes[i]`. Every position is a new object. `fromWorld` and
   * `toWorld` aren't included.
   */
  readonly points: Vector2[];

  /**
   * The point the search started from, the enabled point closest to
   * `fromWorld`, or `null` when the graph has no enabled point.
   */
  readonly startPointId: number | null;

  /**
   * The point the search looked for, the enabled point closest to
   * `toWorld`, or `null` when the graph has no enabled point.
   */
  readonly goalPointId: number | null;
}

const assertFinitePosition = (name: string, position: Vector2): void => {
  if (!Number.isFinite(position.x) || !Number.isFinite(position.y)) {
    throw new Error(
      `Unable to find a waypoint path, ${name} (${position.x}, ${position.y}) isn't finite.`,
    );
  }
};

/**
 * Finds the cheapest route through a waypoint graph between two world
 * positions, as the positions of the points it goes through. Each end goes
 * to its closest enabled point and the search runs between those points.
 *
 * As with {@link findPath}, a route that doesn't reach the goal point ends
 * at the reached point nearest it, so a unit can head as far towards its
 * target as the connections go.
 * @param graph - The graph to search.
 * @param fromWorld - The world position to start from.
 * @param toWorld - The world position to find a route to.
 * @param options - Options for the search.
 * @returns How the search ended, the route's points and their positions,
 * its cost, how many points it expanded, and the points it searched
 * between.
 * @throws An error if either position isn't finite, or for any reason
 * {@link findPath} throws.
 */
export const findWaypointPath = (
  graph: WaypointGraph,
  fromWorld: Vector2,
  toWorld: Vector2,
  options?: FindPathOptions,
): FindWaypointPathResult => {
  assertFinitePosition('fromWorld', fromWorld);
  assertFinitePosition('toWorld', toWorld);

  const start = graph.closestPoint(fromWorld);
  const goal = graph.closestPoint(toWorld);

  // Both are null together: there's no enabled point to snap either to.
  if (start === null || goal === null) {
    return {
      status: 'unreachable',
      nodes: [],
      cost: 0,
      expanded: 0,
      points: [],
      startPointId: null,
      goalPointId: null,
    };
  }

  const result = findPath(graph, start, goal, options);
  const points = result.nodes.map((node) => graph.getPosition(node));

  return { ...result, points, startPointId: start, goalPointId: goal };
};
