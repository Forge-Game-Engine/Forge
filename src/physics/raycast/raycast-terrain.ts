import { Vec2, Vector2 } from '../../math/index.js';
import { TerrainCollider } from '../colliders/terrain-collider.js';
import { CollisionBody } from '../types/collision-body.js';
import { RaycastShapeHit } from '../types/raycast-hit.js';
import { raycastConvexPolygon } from './raycast-convex-polygon.js';

function localXRange(
  start: Vector2,
  end: Vector2,
  terrainBody: CollisionBody,
): { minX: number; maxX: number } {
  // Clone before subtracting: `start`/`end` are the caller's own ray
  // points, so this must not mutate them.
  const localStart = Vec2.rotate(
    Vec2.subtract(Vec2.clone(start), terrainBody.position),
    -terrainBody.rotation,
  );
  const localEnd = Vec2.rotate(
    Vec2.subtract(Vec2.clone(end), terrainBody.position),
    -terrainBody.rotation,
  );

  return {
    minX: Math.min(localStart.x, localEnd.x),
    maxX: Math.max(localStart.x, localEnd.x),
  };
}

/**
 * Casts a ray segment against a terrain-collider body, by running the same
 * ray-vs-convex-polygon test used for {@link raycastPolygon} against each of
 * the terrain's segments that overlap the ray's local x-range, keeping the
 * intersection closest to `start`.
 * @param terrainBody - The body with a {@link TerrainCollider}.
 * @param start - The ray's world-space start point.
 * @param end - The ray's world-space end point.
 * @returns The intersection closest to `start`, or `null` if the segment
 * from `start` to `end` doesn't cross the terrain.
 */
export function raycastTerrain(
  terrainBody: CollisionBody,
  start: Vector2,
  end: Vector2,
): RaycastShapeHit | null {
  const terrainCollider = terrainBody.collider as TerrainCollider;
  const { minX, maxX } = localXRange(start, end, terrainBody);

  let closest: RaycastShapeHit | null = null;

  for (const segment of terrainCollider.segments) {
    if (maxX < segment.minX || minX > segment.maxX) {
      continue;
    }

    // Clone before rotating: `segment.vertices`/`segment.normals` are the
    // terrain collider's own persistent local-space segment data (its
    // surface vertices alias `terrainCollider.points` directly), reused
    // every tick.
    const vertices = segment.vertices.map((vertex) =>
      Vec2.add(
        Vec2.rotate(Vec2.clone(vertex), terrainBody.rotation),
        terrainBody.position,
      ),
    );
    const normals = segment.normals.map((normal) =>
      Vec2.rotate(Vec2.clone(normal), terrainBody.rotation),
    );

    const hit = raycastConvexPolygon(vertices, normals, start, end);

    if (hit !== null && (closest === null || hit.distance < closest.distance)) {
      closest = hit;
    }
  }

  return closest;
}
