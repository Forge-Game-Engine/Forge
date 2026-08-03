import {
  vector2Add,
  vector2Clone,
  vector2Divide,
  vector2Magnitude,
  vector2Multiply,
  vector2Subtract,
  vector2Up,
} from '../../math/index.js';
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
  const centerA = vector2Add(vector2Clone(bodyA.position), colliderA.offset);
  const centerB = vector2Add(vector2Clone(bodyB.position), colliderB.offset);

  const delta = vector2Subtract(centerB, centerA);
  const distance = vector2Magnitude(delta);
  const radiusSum = colliderA.radius + colliderB.radius;

  if (distance > radiusSum) {
    return null;
  }

  const normal = distance === 0 ? vector2Up() : vector2Divide(delta, distance);
  const depth = radiusSum - distance;
  // Scale a clone of `normal`, not `normal` itself: `normal` is returned as
  // the manifold's unit contact normal.
  const contactPoint = vector2Add(
    centerA,
    vector2Multiply(vector2Clone(normal), colliderA.radius),
  );

  return {
    normal,
    depth,
    contactPoints: [contactPoint],
    featureIds: [0],
  };
}
