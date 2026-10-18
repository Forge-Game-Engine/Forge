import { CircleCollider } from '../colliders/circle-collider.js';
import { TerrainCollider } from '../colliders/terrain-collider.js';
import { CollisionBody } from '../types/collision-body.js';
import { NarrowPhaseManifold } from '../types/collision-manifold.js';
import {
  findCircleEdgeContacts,
  toChainLocal,
  toCircleChainManifolds,
} from './edge-chain-contacts.js';

/**
 * Detects the collisions between a circle-collider body and a
 * terrain-collider body, against the terrain's surface chain (see
 * {@link ChainEdge}). The terrain's solid slab is never tested, so a
 * contact normal always comes from the ground's actual surface and never
 * from an interior boundary between two neighboring surface edges.
 *
 * Which surface features are in contact is decided purely by the geometry,
 * so a circle resting on flat ground or on a ridge produces exactly one
 * contact, and one wedged into a valley produces one per side it touches.
 *
 * A circle that has sunk below the surface is pushed back up through it.
 * One deep enough under the terrain to have passed out of the bottom of its
 * slab is treated as having fallen through, exactly as it would have with
 * a closed slab, rather than being dragged all the way back up to the
 * surface.
 * @param circleBody - The body with a {@link CircleCollider}.
 * @param terrainBody - The body with a {@link TerrainCollider}.
 * @returns One manifold per surface feature the circle touches (entity ids
 * not yet populated, normals pointing from `circleBody` toward
 * `terrainBody`), ordered left to right along the terrain, or an empty
 * array if the shapes don't overlap.
 */
export function detectCircleTerrainCollision(
  circleBody: CollisionBody,
  terrainBody: CollisionBody,
): NarrowPhaseManifold[] {
  const circleCollider = circleBody.collider as CircleCollider;
  const terrainCollider = terrainBody.collider as TerrainCollider;
  const { radius } = circleCollider;

  const localCenter = toChainLocal(
    circleCollider.getWorldCenter(circleBody.position, circleBody.rotation),
    terrainBody,
  );

  if (localCenter.y - radius > terrainCollider.bottomY) {
    return [];
  }

  // Every edge above or below the circle within its x-range, however far:
  // a circle that has sunk below the surface is still pushed back up.
  const edgeIndices = terrainCollider.surface.queryEdges({
    min: { x: localCenter.x - radius, y: -Infinity },
    max: { x: localCenter.x + radius, y: Infinity },
  });

  return toCircleChainManifolds(
    findCircleEdgeContacts(
      terrainCollider.surface,
      edgeIndices,
      localCenter,
      radius,
    ),
    radius,
    terrainBody,
  );
}
