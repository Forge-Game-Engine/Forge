import { Vec2, Vector2 } from '../../math/index.js';
import {
  buildTerrainEdgeSlab,
  TerrainCollider,
} from '../colliders/terrain-collider.js';
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
 * ray-vs-convex-polygon test used for {@link raycastPolygon} against the
 * solid slab column beneath each of the terrain's surface edges that
 * overlaps the ray's local x-range, keeping the intersection closest to
 * `start`.
 *
 * Unlike narrow-phase collision - which only ever meets the terrain's
 * surface, so a moving body can't catch on a boundary between two
 * neighboring columns (see {@link TerrainSurfaceEdge}) - a ray can
 * legitimately enter the slab from any direction, including from
 * underneath, so it is tested against the whole solid.
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

  for (const edge of terrainCollider.surface) {
    if (maxX < edge.start.x || minX > edge.end.x) {
      continue;
    }

    const slab = buildTerrainEdgeSlab(
      edge,
      terrainCollider.bottomY,
      terrainBody.position,
      terrainBody.rotation,
    );

    const hit = raycastConvexPolygon(slab.vertices, slab.normals, start, end);

    if (hit !== null && (closest === null || hit.distance < closest.distance)) {
      closest = hit;
    }
  }

  return closest;
}
