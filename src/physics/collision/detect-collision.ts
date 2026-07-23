import type { RigidBody } from '../rigid-body.js';
import type { CollisionManifold } from './collision-manifold.js';
import { detectCircleCircleCollision } from './detect-circle-circle-collision.js';
import { detectCirclePolygonCollision } from './detect-circle-polygon-collision.js';
import { detectCircleTerrainCollision } from './detect-circle-terrain-collision.js';
import { detectPolygonPolygonCollision } from './detect-polygon-polygon-collision.js';
import { detectPolygonTerrainCollision } from './detect-polygon-terrain-collision.js';

function flipManifold(
  manifold: CollisionManifold | null,
): CollisionManifold | null {
  if (manifold === null) {
    return null;
  }

  return {
    bodyA: manifold.bodyB,
    bodyB: manifold.bodyA,
    normal: manifold.normal.negate(),
    depth: manifold.depth,
    contactPoints: manifold.contactPoints,
  };
}

const collisionDetectors = new Map<
  string,
  (bodyA: RigidBody, bodyB: RigidBody) => CollisionManifold | null
>([
  ['circle-circle', detectCircleCircleCollision],
  ['circle-polygon', detectCirclePolygonCollision],
  [
    'polygon-circle',
    (bodyA, bodyB) => flipManifold(detectCirclePolygonCollision(bodyB, bodyA)),
  ],
  ['polygon-polygon', detectPolygonPolygonCollision],
  ['circle-terrain', detectCircleTerrainCollision],
  [
    'terrain-circle',
    (bodyA, bodyB) => flipManifold(detectCircleTerrainCollision(bodyB, bodyA)),
  ],
  ['polygon-terrain', detectPolygonTerrainCollision],
  [
    'terrain-polygon',
    (bodyA, bodyB) => flipManifold(detectPolygonTerrainCollision(bodyB, bodyA)),
  ],
]);

/**
 * Detects a collision between two {@link RigidBody} instances, dispatching
 * to the appropriate narrow-phase detector based on each body's shape type.
 * @param bodyA - The first body.
 * @param bodyB - The second body.
 * @returns A {@link CollisionManifold} if the bodies overlap, otherwise
 * `null`.
 * @throws An error if no detector is registered for the bodies' shape pair.
 */
export function detectCollision(
  bodyA: RigidBody,
  bodyB: RigidBody,
): CollisionManifold | null {
  const key = `${bodyA.shape.type}-${bodyB.shape.type}`;
  const detector = collisionDetectors.get(key);

  if (!detector) {
    throw new Error(
      `No collision detector registered for shape pair "${key}".`,
    );
  }

  return detector(bodyA, bodyB);
}
