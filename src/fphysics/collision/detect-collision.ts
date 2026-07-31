import { CollisionBody } from '../types/collision-body.js';
import { CollisionManifold } from '../types/collision-manifold.js';
import { detectCircleCircleCollision } from './detect-circle-circle-collision.js';
import { detectCirclePolygonCollision } from './detect-circle-polygon-collision.js';
import { detectPolygonPolygonCollision } from './detect-polygon-polygon-collision.js';

type NarrowPhaseManifold = Omit<CollisionManifold, 'entityA' | 'entityB'>;

function flipManifold(
  manifold: NarrowPhaseManifold | null,
): NarrowPhaseManifold | null {
  if (manifold === null) {
    return null;
  }

  return {
    normal: manifold.normal.negate(),
    depth: manifold.depth,
    contactPoints: manifold.contactPoints,
    featureIds: manifold.featureIds,
  };
}

const collisionDetectors = new Map<
  string,
  (bodyA: CollisionBody, bodyB: CollisionBody) => NarrowPhaseManifold | null
>([
  ['circle-circle', detectCircleCircleCollision],
  ['circle-polygon', detectCirclePolygonCollision],
  [
    'polygon-circle',
    (bodyA, bodyB) => flipManifold(detectCirclePolygonCollision(bodyB, bodyA)),
  ],
  ['polygon-polygon', detectPolygonPolygonCollision],
]);

/**
 * Detects a collision between two {@link CollisionBody} instances,
 * dispatching to the appropriate narrow-phase detector based on each
 * body's collider type.
 * @param bodyA - The first body.
 * @param bodyB - The second body.
 * @returns A collision manifold (entity ids not yet populated, normal
 * pointing from `bodyA` toward `bodyB`) if the bodies overlap, otherwise
 * `null`.
 * @throws An error if no detector is registered for the bodies' collider
 * pair.
 */
export function detectCollision(
  bodyA: CollisionBody,
  bodyB: CollisionBody,
): NarrowPhaseManifold | null {
  const key = `${bodyA.collider.type}-${bodyB.collider.type}`;
  const detector = collisionDetectors.get(key);

  if (!detector) {
    throw new Error(
      `No collision detector registered for collider pair "${key}".`,
    );
  }

  return detector(bodyA, bodyB);
}
