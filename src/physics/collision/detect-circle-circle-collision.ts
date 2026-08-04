import { Vec2 } from '../../math/index.js';
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

  // Clone before adding: `bodyA.position`/`bodyB.position` are the entities'
  // live world position, so this must not mutate them.
  const centerA = Vec2.add(Vec2.clone(bodyA.position), colliderA.offset);
  const centerB = Vec2.add(Vec2.clone(bodyB.position), colliderB.offset);

  const delta = Vec2.subtract(centerB, centerA);
  const distance = Vec2.magnitude(delta);
  const radiusSum = colliderA.radius + colliderB.radius;

  if (distance > radiusSum) {
    return null;
  }

  const normal = distance === 0 ? Vec2.up : Vec2.divide(delta, distance);
  const depth = radiusSum - distance;
  // Scale a clone of `normal`, not `normal` itself: `normal` is returned as
  // the manifold's unit contact normal.
  const contactPoint = Vec2.add(
    centerA,
    Vec2.multiply(Vec2.clone(normal), colliderA.radius),
  );

  return {
    normal,
    depth,
    contactPoints: [contactPoint],
    featureIds: [0],
  };
}
