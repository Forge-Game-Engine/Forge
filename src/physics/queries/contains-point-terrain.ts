import { Vector2 } from '../../math/index.js';
import { TerrainCollider } from '../colliders/terrain-collider.js';
import { toChainLocal } from '../collision/edge-chain-contacts.js';
import { CollisionBody } from '../types/collision-body.js';

/**
 * Checks whether a terrain-collider body contains a world-space point. A
 * terrain's solid is its whole slab: between its surface and its flat
 * bottom (`bottomY`), over the surface's x range, the same solid
 * `raycastTerrain` hits and navigation baking blocks. Bodies only collide
 * with the surface, but the point query still reports a point deep in the
 * ground as inside it.
 * @param terrainBody - The body with a {@link TerrainCollider}.
 * @param point - The world-space point.
 * @returns `true` if the point is inside the slab or on its boundary, and
 * `false` for a point left of the first surface point or right of the last.
 */
export function containsPointTerrain(
  terrainBody: CollisionBody,
  point: Vector2,
): boolean {
  const { points, bottomY } = terrainBody.collider as TerrainCollider;
  const local = toChainLocal(point, terrainBody);
  const lastIndex = points.length - 1;

  if (
    local.x < points[0].x ||
    local.x > points[lastIndex].x ||
    local.y > bottomY
  ) {
    return false;
  }

  // The last point at or left of the query's x, by binary search: the
  // points' x strictly increases.
  let low = 0;
  let high = lastIndex - 1;

  while (low < high) {
    const middle = Math.ceil((low + high) / 2);

    if (points[middle].x <= local.x) {
      low = middle;
    } else {
      high = middle - 1;
    }
  }

  const left = points[low];
  const right = points[low + 1];
  const t = (local.x - left.x) / (right.x - left.x);
  const surfaceY = left.y + t * (right.y - left.y);

  // Y-down: below the surface is a larger y.
  return local.y >= surfaceY;
}
