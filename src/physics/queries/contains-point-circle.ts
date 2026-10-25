import { Vector2 } from '../../math/index.js';
import { CircleCollider } from '../colliders/circle-collider.js';
import { toChainLocal } from '../collision/edge-chain-contacts.js';
import { CollisionBody } from '../types/collision-body.js';

/**
 * Checks whether a circle-collider body contains a world-space point: the
 * point is no farther than `radius` from the circle's center, turned and
 * moved with the body.
 * @param circleBody - The body with a {@link CircleCollider}.
 * @param point - The world-space point.
 * @returns `true` if the point is inside the circle or on its edge.
 */
export function containsPointCircle(
  circleBody: CollisionBody,
  point: Vector2,
): boolean {
  const { center, radius } = circleBody.collider as CircleCollider;
  const local = toChainLocal(point, circleBody);
  const deltaX = local.x - center.x;
  const deltaY = local.y - center.y;

  return deltaX * deltaX + deltaY * deltaY <= radius * radius;
}
