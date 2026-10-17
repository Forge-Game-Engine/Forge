import { ChainCollider } from '../colliders/chain-collider.js';
import { CircleCollider } from '../colliders/circle-collider.js';
import { CollisionBody } from '../types/collision-body.js';
import { NarrowPhaseManifold } from '../types/collision-manifold.js';
import {
  findCircleEdgeContacts,
  isInFrontOfEdge,
  toChainLocal,
  toCircleChainManifolds,
} from './edge-chain-contacts.js';

/**
 * Detects the collisions between a circle-collider body and a chain-collider
 * body, against the edges of the chain's loops (see {@link ChainEdge}) near
 * the circle.
 *
 * Collision is one-sided: an edge only pushes a circle whose center is in
 * front of it, on the side its outward normal faces. Each edge's neighbors
 * in its loop are its ghost edges, so a circle rolling across the joint
 * between two edges of a flat floor gets one contact with the floor's
 * normal, a circle on a convex corner gets one contact at the corner, and a
 * circle wedged into a concave corner gets one contact from each wall.
 * @param circleBody - The body with a {@link CircleCollider}.
 * @param chainBody - The body with a {@link ChainCollider}.
 * @returns One manifold per edge or corner the circle touches (entity ids
 * not yet populated, normals pointing from `circleBody` toward
 * `chainBody`), or an empty array if the shapes don't overlap.
 */
export function detectCircleChainCollision(
  circleBody: CollisionBody,
  chainBody: CollisionBody,
): NarrowPhaseManifold[] {
  const circleCollider = circleBody.collider as CircleCollider;
  const { outline } = chainBody.collider as ChainCollider;
  const { radius } = circleCollider;

  const localCenter = toChainLocal(
    circleCollider.getWorldCenter(circleBody.position, circleBody.rotation),
    chainBody,
  );

  const edgeIndices = outline
    .queryEdges({
      min: { x: localCenter.x - radius, y: localCenter.y - radius },
      max: { x: localCenter.x + radius, y: localCenter.y + radius },
    })
    .filter((edgeIndex) => isInFrontOfEdge(outline, edgeIndex, localCenter));

  return toCircleChainManifolds(
    findCircleEdgeContacts(outline, edgeIndices, localCenter, radius),
    radius,
    chainBody,
  );
}
