import { Vector2 } from '../../math/index.js';
import {
  buildTerrainEdgeSlab,
  TerrainCollider,
} from '../colliders/terrain-collider.js';
import { toChainLocal } from '../collision/edge-chain-contacts.js';
import { CollisionBody } from '../types/collision-body.js';
import { RaycastShapeHit } from '../types/raycast-hit.js';
import { raycastConvexPolygon } from './raycast-convex-polygon.js';

/**
 * Casts a ray segment against a terrain-collider body, by running the same
 * ray-vs-convex-polygon test used for {@link raycastPolygon} against the
 * solid slab column beneath each of the terrain's surface edges that
 * overlaps the ray's local x-range, keeping the intersection closest to
 * `start`.
 *
 * Unlike narrow-phase collision - which only ever meets the terrain's
 * surface, so a moving body can't catch on a boundary between two
 * neighboring columns (see {@link ChainEdge}) - a ray can legitimately
 * enter the slab from any direction, including from underneath, so it is
 * tested against the whole solid.
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
  const localStart = toChainLocal(start, terrainBody);
  const localEnd = toChainLocal(end, terrainBody);

  // The column beneath an edge reaches down to the slab's bottom, so every
  // edge in the ray's x-range counts, however far above the ray it is.
  const edgeIndices = terrainCollider.surface.queryEdges({
    min: { x: Math.min(localStart.x, localEnd.x), y: -Infinity },
    max: { x: Math.max(localStart.x, localEnd.x), y: Infinity },
  });

  let closest: RaycastShapeHit | null = null;

  for (const edgeIndex of edgeIndices) {
    const slab = buildTerrainEdgeSlab(
      terrainCollider.surface.edges[edgeIndex],
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
