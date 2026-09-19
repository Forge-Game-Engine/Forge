import { Vec2 } from '../../math/index.js';
import { CollisionBody } from '../types/collision-body.js';
import { NarrowPhaseManifold } from '../types/collision-manifold.js';
import { detectCircleCircleCollision } from './detect-circle-circle-collision.js';
import { detectCirclePolygonCollision } from './detect-circle-polygon-collision.js';
import { detectCircleTerrainCollision } from './detect-circle-terrain-collision.js';
import { detectPolygonPolygonCollision } from './detect-polygon-polygon-collision.js';
import { detectPolygonTerrainCollision } from './detect-polygon-terrain-collision.js';

type ManifoldDetector = (
  bodyA: CollisionBody,
  bodyB: CollisionBody,
) => NarrowPhaseManifold[];

type SingleManifoldDetector = (
  bodyA: CollisionBody,
  bodyB: CollisionBody,
) => NarrowPhaseManifold | null;

/**
 * Adapts a detector for a pair of convex shapes - which can only ever have
 * one manifold between them - to the list every detector is dispatched
 * through.
 */
function asManifolds(detect: SingleManifoldDetector): ManifoldDetector {
  return (bodyA, bodyB) => {
    const manifold = detect(bodyA, bodyB);

    return manifold === null ? [] : [manifold];
  };
}

/**
 * Adapts a detector to the reversed argument order, flipping each manifold's
 * normal so it still points from the caller's `bodyA` toward its `bodyB`.
 */
function flipped(detect: ManifoldDetector): ManifoldDetector {
  return (ownBodyA, ownBodyB) =>
    detect(ownBodyB, ownBodyA).map((manifold) => ({
      // Clone before negating: a detector that returns several manifolds at
      // once may hand back the same normal object in more than one of them
      // (they share the reference face it came from), so negating in place
      // would flip it twice.
      normal: Vec2.negate(Vec2.clone(manifold.normal)),
      depth: manifold.depth,
      contactPoints: manifold.contactPoints,
      featureIds: manifold.featureIds,
    }));
}

const collisionDetectors = new Map<string, ManifoldDetector>([
  ['circle-circle', asManifolds(detectCircleCircleCollision)],
  ['circle-polygon', asManifolds(detectCirclePolygonCollision)],
  ['polygon-circle', flipped(asManifolds(detectCirclePolygonCollision))],
  ['polygon-polygon', asManifolds(detectPolygonPolygonCollision)],
  ['circle-terrain', detectCircleTerrainCollision],
  ['terrain-circle', flipped(detectCircleTerrainCollision)],
  ['polygon-terrain', detectPolygonTerrainCollision],
  ['terrain-polygon', flipped(detectPolygonTerrainCollision)],
]);

/**
 * Detects the collisions between two {@link CollisionBody} instances,
 * dispatching to the appropriate narrow-phase detector based on each
 * body's collider type.
 *
 * Two convex shapes have at most one manifold between them, but a
 * {@link TerrainCollider}'s surface is a chain rather than a single convex
 * shape, so a body wide enough to straddle several of its surface edges
 * gets one manifold per edge it touches.
 * @param bodyA - The first body.
 * @param bodyB - The second body.
 * @returns One manifold per contacting feature pair (entity ids not yet
 * populated, normals pointing from `bodyA` toward `bodyB`), or an empty
 * array if the bodies don't overlap.
 * @throws An error if no detector is registered for the bodies' collider
 * pair.
 */
export function detectCollision(
  bodyA: CollisionBody,
  bodyB: CollisionBody,
): NarrowPhaseManifold[] {
  const key = `${bodyA.collider.type}-${bodyB.collider.type}`;
  const detector = collisionDetectors.get(key);

  if (!detector) {
    throw new Error(
      `No collision detector registered for collider pair "${key}".`,
    );
  }

  return detector(bodyA, bodyB);
}
