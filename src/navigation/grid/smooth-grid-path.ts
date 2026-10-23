import { Vector2 } from '../../math/vector2.js';
import { NavigationGrid } from './navigation-grid.js';
import { walkSegmentCells } from './walk-segment-cells.js';

/**
 * Measures what walking a straight segment costs: its world length in
 * each cell it crosses times the cell's cost, added up. Cells outside the
 * grid add nothing.
 * @param grid - The grid the segment crosses.
 * @param from - The world position the segment starts at.
 * @param to - The world position the segment ends at.
 * @returns The segment's cost.
 */
const measureSegmentCost = (
  grid: NavigationGrid,
  from: Vector2,
  to: Vector2,
): number => {
  const length = Math.hypot(to.x - from.x, to.y - from.y);
  let cost = 0;

  walkSegmentCells(grid, from, to, (column, row, share) => {
    if (grid.hasCell(column, row)) {
      cost += length * share * grid.getCost(column, row);
    }

    return true;
  });

  return cost;
};

/**
 * Checks whether a unit can walk straight from one point of a path to a
 * later one instead of following the path: every cell the segment touches
 * is in the grid and walkable, and the segment costs no more than the
 * stretch of path it replaces.
 * @param grid - The grid the path crosses.
 * @param from - The world position the shortcut starts at.
 * @param to - The world position the shortcut ends at.
 * @param budget - The most the shortcut may cost.
 * @returns `true` if the shortcut can replace the stretch of path.
 */
const isShortcut = (
  grid: NavigationGrid,
  from: Vector2,
  to: Vector2,
  budget: number,
): boolean => {
  const length = Math.hypot(to.x - from.x, to.y - from.y);
  let cost = 0;

  return walkSegmentCells(grid, from, to, (column, row, share) => {
    if (!grid.hasCell(column, row) || !grid.isWalkable(column, row)) {
      return false;
    }

    cost += length * share * grid.getCost(column, row);

    return cost <= budget;
  });
};

/**
 * Finds the point a smoothed path keeps after a point it kept.
 * @param grid - The grid the path crosses.
 * @param path - The path's world positions.
 * @param pathCosts - What following the path costs from its first point
 * to each of its points.
 * @param current - The index of the kept point, before the last.
 * @returns The index of the farthest later point the kept point has a
 * shortcut to, or `current + 1` when no point after that one has.
 */
const findNextWaypoint = (
  grid: NavigationGrid,
  path: readonly Vector2[],
  pathCosts: readonly number[],
  current: number,
): number => {
  for (let candidate = path.length - 1; candidate > current + 1; candidate--) {
    // A straight segment along the path costs the same as the steps it
    // replaces, give or take rounding, so the budget allows for that.
    const budget =
      pathCosts[candidate] - pathCosts[current] + 1e-9 * pathCosts[candidate];

    if (isShortcut(grid, path[current], path[candidate], budget)) {
      return candidate;
    }
  }

  return current + 1;
};

/**
 * Smooths a path across a navigation grid into straight-line waypoints by
 * string pulling: it keeps the path's first point and, from each kept
 * point, the farthest later point it has a shortcut to, dropping the
 * points in between. A shortcut is a straight segment that's in line of
 * sight (see {@link hasLineOfSight}) and costs no more than the stretch of
 * path it replaces. When no later point but the next has one, such as
 * from a start inside a blocked cell, the next is kept. The last point is
 * always kept. A path across an open room becomes one straight segment, a
 * path around a wall keeps a waypoint at each corner it turns, and a path
 * around costly cells, such as mud the cheapest path went around, keeps
 * going around them.
 *
 * A segment, whether a shortcut or a step of the path, costs its world
 * length in each cell it crosses times the cell's cost, added up. Parts
 * of the path outside the grid add nothing. On a grid where every cell
 * costs the same, a shortcut is never longer than the path it replaces,
 * so only line of sight decides.
 *
 * Smoothing is a separate step from {@link findGridPath} because not every
 * game wants it: a turn-based game moves cell by cell along the raw path.
 *
 * It checks each kept point against every later point, farthest first, so
 * it does up to `n²/2` checks for a path of `n` points that winds through
 * many corners. A check stops at the first blocked cell, or once the
 * shortcut costs more than the path.
 * @param grid - The grid the path crosses.
 * @param path - The world positions to smooth, such as
 * {@link FindGridPathResult.points}. It isn't changed.
 * @returns A new array of new `Vector2`s, a subset of `path` in the same
 * order: empty for an empty path, and holding the first and last points
 * otherwise.
 * @throws An error if a point of the path isn't finite.
 */
export const smoothGridPath = (
  grid: NavigationGrid,
  path: readonly Vector2[],
): Vector2[] => {
  for (let i = 0; i < path.length; i++) {
    const { x, y } = path[i];

    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      throw new Error(
        `Unable to smooth a grid path, point ${i} (${x}, ${y}) isn't finite.`,
      );
    }
  }

  if (path.length === 0) {
    return [];
  }

  const pathCosts = [0];

  for (let i = 1; i < path.length; i++) {
    pathCosts.push(
      pathCosts[i - 1] + measureSegmentCost(grid, path[i - 1], path[i]),
    );
  }

  const last = path.length - 1;
  const smoothed: Vector2[] = [{ x: path[0].x, y: path[0].y }];
  let current = 0;

  while (current < last) {
    const next = findNextWaypoint(grid, path, pathCosts, current);

    smoothed.push({ x: path[next].x, y: path[next].y });
    current = next;
  }

  return smoothed;
};
