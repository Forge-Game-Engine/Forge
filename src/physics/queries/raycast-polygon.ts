import { Vector2 } from '../../math/index.js';
import { PolygonCollider } from '../colliders/polygon-collider.js';
import { CollisionBody } from '../types/collision-body.js';
import { RaycastShapeHit } from '../types/raycast-hit.js';
import { raycastConvexPolygon } from './raycast-convex-polygon.js';

/**
 * Casts a ray segment against a polygon-collider body.
 * @param polygonBody - The body with a {@link PolygonCollider}.
 * @param start - The ray's world-space start point.
 * @param end - The ray's world-space end point.
 * @returns The intersection closest to `start`, or `null` if the segment
 * from `start` to `end` doesn't cross the polygon.
 */
export function raycastPolygon(
  polygonBody: CollisionBody,
  start: Vector2,
  end: Vector2,
): RaycastShapeHit | null {
  const polygonCollider = polygonBody.collider as PolygonCollider;
  const vertices = polygonCollider.getWorldVertices(
    polygonBody.position,
    polygonBody.rotation,
  );
  const normals = polygonCollider.getWorldNormals(polygonBody.rotation);

  return raycastConvexPolygon(vertices, normals, start, end);
}
