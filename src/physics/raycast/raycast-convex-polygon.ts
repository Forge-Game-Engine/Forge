import { Vec2, Vector2 } from '../../math/index.js';
import { RaycastShapeHit } from '../types/raycast-hit.js';

const EPSILON = 1e-9;

/**
 * Casts a ray segment against a convex polygon's world-space edges, keeping
 * the intersection closest to `start`. Used for both {@link PolygonCollider}
 * and each of a {@link TerrainCollider}'s segments, which share the same
 * vertices/normals shape.
 * @param vertices - The polygon's world-space vertices, in order.
 * @param normals - The polygon's world-space outward-facing edge normals,
 * one per edge between consecutive `vertices`.
 * @param start - The ray's world-space start point.
 * @param end - The ray's world-space end point.
 * @returns The closest intersection to `start`, or `null` if the segment
 * from `start` to `end` doesn't cross any edge.
 */
export function raycastConvexPolygon(
  vertices: readonly Vector2[],
  normals: readonly Vector2[],
  start: Vector2,
  end: Vector2,
): RaycastShapeHit | null {
  const direction = Vec2.subtract(Vec2.clone(end), start);

  let closestRayParameter = Infinity;
  let closestPoint: Vector2 | null = null;
  let closestNormal: Vector2 | null = null;

  for (let i = 0; i < vertices.length; i++) {
    const edgeStart = vertices[i];
    const edgeEnd = vertices[(i + 1) % vertices.length];
    const edge = Vec2.subtract(Vec2.clone(edgeEnd), edgeStart);
    const denominator = Vec2.cross(direction, edge);

    if (Math.abs(denominator) < EPSILON) {
      continue;
    }

    // Clone before subtracting: `edgeStart`/`start` are the caller's own
    // vertex/ray points, so this must not mutate them.
    const toEdgeStart = Vec2.subtract(Vec2.clone(edgeStart), start);
    const rayParameter = Vec2.cross(toEdgeStart, edge) / denominator;
    const edgeParameter = Vec2.cross(toEdgeStart, direction) / denominator;

    if (
      rayParameter < 0 ||
      rayParameter > 1 ||
      edgeParameter < 0 ||
      edgeParameter > 1 ||
      rayParameter >= closestRayParameter
    ) {
      continue;
    }

    closestRayParameter = rayParameter;
    closestPoint = Vec2.add(
      Vec2.multiply(Vec2.clone(direction), rayParameter),
      start,
    );
    closestNormal = Vec2.clone(normals[i]);
  }

  if (closestPoint === null || closestNormal === null) {
    return null;
  }

  return {
    point: closestPoint,
    normal: closestNormal,
    distance: Vec2.distanceTo(start, closestPoint),
  };
}
