import { Vector2 } from '../../math/index.js';
import { PolygonCollider } from '../colliders/polygon-collider.js';
import { toChainLocal } from '../collision/edge-chain-contacts.js';
import { CollisionBody } from '../types/collision-body.js';

/**
 * Checks whether a polygon-collider body contains a world-space point. A
 * `PolygonCollider` is always convex, so the point is inside when it's
 * behind (or on) every edge, against the edge's outward normal.
 * @param polygonBody - The body with a {@link PolygonCollider}.
 * @param point - The world-space point.
 * @returns `true` if the point is inside the polygon or on its boundary.
 */
export function containsPointPolygon(
  polygonBody: CollisionBody,
  point: Vector2,
): boolean {
  const { vertices, normals } = polygonBody.collider as PolygonCollider;
  // One point moved into local space instead of every vertex and normal
  // moved into world space.
  const local = toChainLocal(point, polygonBody);

  for (let i = 0; i < vertices.length; i++) {
    const vertex = vertices[i];
    const normal = normals[i];

    if (normal.x * (local.x - vertex.x) + normal.y * (local.y - vertex.y) > 0) {
      return false;
    }
  }

  return true;
}
