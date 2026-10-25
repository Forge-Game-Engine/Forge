import { PolygonCollider } from '../colliders/polygon-collider.js';
import { TerrainCollider } from '../colliders/terrain-collider.js';
import { CollisionBody } from '../types/collision-body.js';
import { NarrowPhaseManifold } from '../types/collision-manifold.js';
import {
  findPolygonEdgeManifolds,
  localBoundsOf,
} from './edge-chain-contacts.js';
import { PolygonFaces } from './polygon-faces-collision.js';

/**
 * Detects the collisions between a polygon-collider body and a
 * terrain-collider body, by running the same reference/incident face
 * clipping used for {@link detectPolygonPolygonCollision} against every
 * edge of the terrain's surface chain (see {@link ChainEdge}) the
 * polygon's local x-range overlaps.
 *
 * Every edge the polygon genuinely straddles contributes its own manifold,
 * rather than all of them competing for one "deepest" slot. That is what
 * makes a wide body's contact stable: an edge's manifold appears when the
 * polygon reaches that edge and disappears when it leaves, its feature ids
 * stay in a range of that edge's own, and no amount of floating-point noise
 * between two near-coplanar edges can make the pair of them trade places
 * from one step to the next and lose their warm-started impulses.
 *
 * The terrain's solid slab is never tested, only its surface, so a contact
 * normal can never come from an interior boundary between two neighboring
 * edges, and one that would nonetheless push the polygon along the ground
 * it was found on is resolved against that ground instead. A polygon that
 * has sunk below the surface is pushed back up through it, however far
 * below it is, until it has passed out of the bottom of the slab.
 * @param polygonBody - The body with a {@link PolygonCollider}.
 * @param terrainBody - The body with a {@link TerrainCollider}.
 * @returns One manifold per surface edge the polygon touches (entity ids
 * not yet populated, normals pointing from `polygonBody` toward
 * `terrainBody`), ordered left to right along the terrain, or an empty
 * array if the shapes don't overlap.
 */
export function detectPolygonTerrainCollision(
  polygonBody: CollisionBody,
  terrainBody: CollisionBody,
): NarrowPhaseManifold[] {
  const polygonCollider = polygonBody.collider as PolygonCollider;
  const terrainCollider = terrainBody.collider as TerrainCollider;

  const polygonFaces: PolygonFaces = {
    vertices: polygonCollider.getWorldVertices(
      polygonBody.position,
      polygonBody.rotation,
    ),
    normals: polygonCollider.getWorldNormals(polygonBody.rotation),
  };

  const { min, max } = localBoundsOf(polygonFaces.vertices, terrainBody);

  // A polygon that has passed out of the bottom of the terrain's slab has
  // fallen through it, exactly as it would have with a closed slab, rather
  // than being dragged all the way back up to the surface.
  if (min.y > terrainCollider.bottomY) {
    return [];
  }

  // Every edge above or below the polygon within its x-range, however far:
  // a polygon that has sunk below the surface is still pushed back up.
  const edgeIndices = terrainCollider.surface.queryEdges({
    min: { x: min.x, y: -Infinity },
    max: { x: max.x, y: Infinity },
  });

  return findPolygonEdgeManifolds(
    terrainCollider.surface,
    edgeIndices,
    polygonFaces,
    terrainBody,
  );
}
