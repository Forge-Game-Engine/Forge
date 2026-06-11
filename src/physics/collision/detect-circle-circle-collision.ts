import { Vector2 } from '../../math/index.js';
import type { RigidBody } from '../rigid-body.js';
import type { CircleShape } from '../shapes/index.js';
import type { CollisionManifold } from './collision-manifold.js';

/**
 * Detects a collision between two circle-shaped bodies.
 * @param bodyA - The first body, with a {@link CircleShape}.
 * @param bodyB - The second body, with a {@link CircleShape}.
 * @returns A {@link CollisionManifold} if the circles overlap, otherwise
 * `null`.
 */
export function detectCircleCircleCollision(
  bodyA: RigidBody,
  bodyB: RigidBody,
): CollisionManifold | null {
  const shapeA = bodyA.shape as CircleShape;
  const shapeB = bodyB.shape as CircleShape;

  const delta = bodyB.position.subtract(bodyA.position);
  const distance = delta.magnitude();
  const radiusSum = shapeA.radius + shapeB.radius;

  if (distance > radiusSum) {
    return null;
  }

  const normal = distance === 0 ? Vector2.up : delta.divide(distance);
  const depth = radiusSum - distance;
  const contactPoint = bodyA.position.add(normal.multiply(shapeA.radius));

  return {
    bodyA,
    bodyB,
    normal,
    depth,
    contactPoints: [contactPoint],
  };
}
