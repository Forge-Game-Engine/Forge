import { Vector2 } from '../../math/vector2.js';
import { hasLineOfSight } from './has-line-of-sight.js';
import { NavigationGrid } from './navigation-grid.js';

/**
 * Finds the point a smoothed path keeps after a point it kept.
 * @param grid - The grid the path crosses.
 * @param path - The path's world positions.
 * @param current - The index of the kept point, before the last.
 * @returns The index of the farthest later point in line of sight of
 * `path[current]`, or `current + 1` when no point after that one is.
 */
const findNextWaypoint = (
  grid: NavigationGrid,
  path: readonly Vector2[],
  current: number,
): number => {
  for (let candidate = path.length - 1; candidate > current + 1; candidate--) {
    if (hasLineOfSight(grid, path[current], path[candidate])) {
      return candidate;
    }
  }

  return current + 1;
};

/**
 * Smooths a path across a navigation grid into straight-line waypoints by
 * string pulling: it keeps the path's first point and, from each kept
 * point, the farthest later point in line of sight of it (see
 * {@link hasLineOfSight}), dropping the points in between. When no later
 * point but the next is in line of sight, such as from a start inside a
 * blocked cell, the next is kept. The last point is always kept. A path
 * across an open room becomes one straight segment, and a path around a
 * wall keeps a waypoint at each corner it turns.
 *
 * Smoothing is a separate step from {@link findGridPath} because not every
 * game wants it: a turn-based game moves cell by cell along the raw path.
 *
 * Only walkability decides what's in line of sight, so a smoothed segment
 * can cross walkable cells that cost more, such as mud the cheapest path
 * went around. Use the raw path where costs matter.
 *
 * It checks line of sight from each kept point to every later point,
 * farthest first, so it does up to `n²/2` checks for a path of `n` points
 * that winds through many corners. A check stops at the first blocked
 * cell.
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

  const last = path.length - 1;
  const smoothed: Vector2[] = [{ x: path[0].x, y: path[0].y }];
  let current = 0;

  while (current < last) {
    const next = findNextWaypoint(grid, path, current);

    smoothed.push({ x: path[next].x, y: path[next].y });
    current = next;
  }

  return smoothed;
};
