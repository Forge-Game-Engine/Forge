import { Vector2 } from '../../math/index.js';
import { CircleCollider } from '../colliders/circle-collider.js';
import { CollisionBody } from '../types/collision-body.js';
import { CollisionManifold } from '../types/collision-manifold.js';

/**
 * Detects a collision between two circle-collider bodies.
 * @param bodyA - The first body, with a {@link CircleCollider}.
 * @param bodyB - The second body, with a {@link CircleCollider}.
 * @returns A collision manifold (entity ids not yet populated) if the
 * circles overlap, otherwise `null`.
 */
export function detectCircleCircleCollision(
  bodyA: CollisionBody,
  bodyB: CollisionBody,
): Omit<CollisionManifold, 'entityA' | 'entityB'> | null {
  const colliderA = bodyA.collider as CircleCollider;
  const colliderB = bodyB.collider as CircleCollider;

  const centerA = bodyA.position.add(colliderA.offset);
  const centerB = bodyB.position.add(colliderB.offset);

  const delta = centerB.subtract(centerA);
  const distance = delta.magnitude();
  const radiusSum = colliderA.radius + colliderB.radius;

  if (distance > radiusSum) {
    return null;
  }

  const normal = distance === 0 ? Vector2.up : delta.divide(distance);
  const depth = radiusSum - distance;
  const contactPoint = centerA.add(normal.multiply(colliderA.radius));

  return {
    normal,
    depth,
    contactPoints: [contactPoint],
  };
}
