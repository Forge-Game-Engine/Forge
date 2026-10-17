import { ChainCollider } from '../colliders/chain-collider.js';
import { PolygonCollider } from '../colliders/polygon-collider.js';
import { getWorldCenterOfMass } from '../rigid-body-mass-data.js';
import { CollisionBody } from '../types/collision-body.js';
import { NarrowPhaseManifold } from '../types/collision-manifold.js';
import {
  findPolygonEdgeManifolds,
  isBehindChainEdge,
  localBoundsOf,
  toChainLocal,
} from './edge-chain-contacts.js';
import { PolygonFaces } from './polygon-faces-collision.js';

/**
 * Detects the collisions between a polygon-collider body and a
 * chain-collider body, by running the same reference/incident face
 * clipping used for {@link detectPolygonPolygonCollision} against each edge
 * of the chain's loops (see {@link ChainEdge}) near the polygon.
 *
 * Every edge the polygon touches contributes its own manifold, with feature
 * ids in a range of that edge's own, so a box resting across several edges
 * keeps its warm-started contacts from tick to tick. A contact normal never
 * comes from the joint between two edges: one that would push the polygon
 * along the outline is resolved against the edge instead, so a box sliding
 * across a floor made of many edges never snags where they meet.
 *
 * Collision is one-sided: an edge doesn't push a polygon whose center of
 * mass is behind it, unless the center is still in front of a neighbor
 * that meets the edge at a convex corner, as for a box balanced on a
 * platform's edge.
 * @param polygonBody - The body with a {@link PolygonCollider}.
 * @param chainBody - The body with a {@link ChainCollider}.
 * @returns One manifold per edge the polygon touches (entity ids not yet
 * populated, normals pointing from `polygonBody` toward `chainBody`), or an
 * empty array if the shapes don't overlap.
 */
export function detectPolygonChainCollision(
  polygonBody: CollisionBody,
  chainBody: CollisionBody,
): NarrowPhaseManifold[] {
  const polygonCollider = polygonBody.collider as PolygonCollider;
  const { outline } = chainBody.collider as ChainCollider;

  const polygonFaces: PolygonFaces = {
    vertices: polygonCollider.getWorldVertices(
      polygonBody.position,
      polygonBody.rotation,
    ),
    normals: polygonCollider.getWorldNormals(polygonBody.rotation),
  };
  const localCenter = toChainLocal(
    getWorldCenterOfMass(
      polygonBody.position,
      polygonBody.rotation,
      polygonCollider.localCenterOfMass,
    ),
    chainBody,
  );

  const edgeIndices = outline
    .queryEdges(localBoundsOf(polygonFaces.vertices, chainBody))
    .filter((edgeIndex) => !isBehindChainEdge(outline, edgeIndex, localCenter));

  return findPolygonEdgeManifolds(
    outline,
    edgeIndices,
    polygonFaces,
    chainBody,
  );
}
