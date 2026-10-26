import { Vec2, Vector2 } from '../../math/index.js';
import { ChainCollider } from '../colliders/chain-collider.js';
import {
  isInFrontOfEdge,
  toChainLocal,
} from '../collision/edge-chain-contacts.js';
import { CollisionBody } from '../types/collision-body.js';
import { RaycastShapeHit } from '../types/raycast-hit.js';

const EPSILON = 1e-9;

/**
 * Casts a ray segment against a chain-collider body's edges, keeping the
 * intersection closest to `start`.
 *
 * Like collision against a chain, the ray is one-sided: it only hits an
 * edge from the side its outward normal faces, the way it enters solid. A
 * ray that starts inside solid passes out through the edge it leaves by
 * without a hit, and hits the next edge where it enters solid again. Only
 * the edges whose bounds the ray reaches are tested.
 * @param chainBody - The body with a {@link ChainCollider}.
 * @param start - The ray's world-space start point.
 * @param end - The ray's world-space end point.
 * @returns The intersection closest to `start`, with the edge's outward
 * normal, or `null` if the segment from `start` to `end` doesn't enter the
 * chain's solid.
 */
export function raycastChain(
  chainBody: CollisionBody,
  start: Vector2,
  end: Vector2,
): RaycastShapeHit | null {
  const { outline } = chainBody.collider as ChainCollider;
  const localStart = toChainLocal(start, chainBody);
  const localEnd = toChainLocal(end, chainBody);
  const direction = Vec2.subtract(Vec2.clone(localEnd), localStart);

  let closestRayParameter = Infinity;
  let closestEdgeIndex: number | null = null;

  for (const edgeIndex of outline.queryEdgesAlongSegment(
    localStart,
    localEnd,
  )) {
    if (!isInFrontOfEdge(outline, edgeIndex, localStart)) {
      continue;
    }

    const edge = outline.edges[edgeIndex];
    // Clone before subtracting: `edge.start`/`edge.end` are the collider's
    // own points.
    const edgeVector = Vec2.subtract(Vec2.clone(edge.end), edge.start);
    const denominator = Vec2.cross(direction, edgeVector);

    if (Math.abs(denominator) < EPSILON) {
      continue;
    }

    const toEdgeStart = Vec2.subtract(Vec2.clone(edge.start), localStart);
    const rayParameter = Vec2.cross(toEdgeStart, edgeVector) / denominator;
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
    closestEdgeIndex = edgeIndex;
  }

  if (closestEdgeIndex === null) {
    return null;
  }

  const worldDirection = Vec2.subtract(Vec2.clone(end), start);

  return {
    point: Vec2.add(
      Vec2.multiply(Vec2.clone(worldDirection), closestRayParameter),
      start,
    ),
    normal: Vec2.rotate(
      Vec2.clone(outline.edges[closestEdgeIndex].normal),
      chainBody.rotation,
    ),
    distance: Vec2.magnitude(worldDirection) * closestRayParameter,
  };
}
