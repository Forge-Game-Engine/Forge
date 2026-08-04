import { Vec2 } from '../../math/index.js';
import { CollisionBody } from '../types/collision-body.js';
import { CollisionManifold } from '../types/collision-manifold.js';
import { detectCircleCircleCollision } from './detect-circle-circle-collision.js';
import { detectCirclePolygonCollision } from './detect-circle-polygon-collision.js';
import { detectCircleTerrainCollision } from './detect-circle-terrain-collision.js';
import { detectPolygonPolygonCollision } from './detect-polygon-polygon-collision.js';
import { detectPolygonTerrainCollision } from './detect-polygon-terrain-collision.js';

type NarrowPhaseManifold = Omit<CollisionManifold, 'entityA' | 'entityB'>;

function flipManifold(
  manifold: NarrowPhaseManifold | null,
): NarrowPhaseManifold | null {
  if (manifold === null) {
    return null;
  }

  return {
    normal: Vec2.negate(manifold.normal),
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
