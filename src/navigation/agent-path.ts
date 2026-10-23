import { Vector2 } from '../math/vector2.js';

/**
 * Adds a unit's two end legs to the positions of the nodes a search found:
 * the unit's own position first, and the target last when the path reaches
 * it. Search results hold node positions only (cell centres or waypoint
 * positions), so without the legs a unit would walk back to its own node
 * first and stop short of the target.
 *
 * The unit's position is put before the first node rather than replacing
 * it: on a grid path that isn't smoothed, a straight line from somewhere
 * in a cell to a diagonal neighbor's centre can cross a third cell the
 * search never checked.
 * @param from - Where the unit is.
 * @param nodePoints - The world positions of the path's nodes, in order.
 * @param to - Where the unit is going.
 * @param reachesTarget - Whether a unit at the last node can walk straight
 * to `to`.
 * @returns A new array of new positions: empty when `nodePoints` is, and at
 * least two points otherwise.
 */
export const buildAgentPath = (
  from: Vector2,
  nodePoints: readonly Vector2[],
  to: Vector2,
  reachesTarget: boolean,
): Vector2[] => {
  if (nodePoints.length === 0) {
    return [];
  }

  const points: Vector2[] = [{ x: from.x, y: from.y }];

  for (const point of nodePoints) {
    points.push({ x: point.x, y: point.y });
  }

  if (reachesTarget) {
    points.push({ x: to.x, y: to.y });
  }

  return points;
};

/**
 * Checks a planner's `maxPathDistance` option.
 * @param factory - The planner factory's name, for the error message.
 * @param maxPathDistance - The value to check.
 * @throws An error if it isn't more than `0` (`Infinity` included).
 */
export const assertMaxPathDistance = (
  factory: string,
  maxPathDistance: number,
): void => {
  if (Number.isNaN(maxPathDistance) || maxPathDistance <= 0) {
    throw new Error(
      `${factory}: maxPathDistance must be more than 0, or Infinity, received ${maxPathDistance}.`,
    );
  }
};
