import { Vec2 } from '../../math/index.js';
import { ColliderType } from '../colliders/collider.js';
import { CollisionBody } from '../types/collision-body.js';
import { NarrowPhaseManifold } from '../types/collision-manifold.js';
import { detectCircleChainCollision } from './detect-circle-chain-collision.js';
import { detectCircleCircleCollision } from './detect-circle-circle-collision.js';
import { detectCirclePolygonCollision } from './detect-circle-polygon-collision.js';
import { detectCircleTerrainCollision } from './detect-circle-terrain-collision.js';
import { detectPolygonChainCollision } from './detect-polygon-chain-collision.js';
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

/**
 * The detector for a pair of shapes that can't be on a dynamic body
 * (`TerrainCollider`s and `ChainCollider`s): no contact between them could
 * ever be resolved, since neither body can move in response, so there's
 * nothing to detect.
 */
const noManifolds: ManifoldDetector = () => [];

/**
 * The detector for every pair of collider types, indexed by the first
 * body's type and then the second's. Typing it over every pair makes a
 * collider type without its detectors a compile error.
 */
const collisionDetectors: Record<
  ColliderType,
  Record<ColliderType, ManifoldDetector>
> = {
  circle: {
    circle: asManifolds(detectCircleCircleCollision),
    polygon: asManifolds(detectCirclePolygonCollision),
    terrain: detectCircleTerrainCollision,
    chain: detectCircleChainCollision,
  },
  polygon: {
    circle: flipped(asManifolds(detectCirclePolygonCollision)),
    polygon: asManifolds(detectPolygonPolygonCollision),
    terrain: detectPolygonTerrainCollision,
    chain: detectPolygonChainCollision,
  },
  terrain: {
    circle: flipped(detectCircleTerrainCollision),
    polygon: flipped(detectPolygonTerrainCollision),
    terrain: noManifolds,
    chain: noManifolds,
  },
  chain: {
    circle: flipped(detectCircleChainCollision),
    polygon: flipped(detectPolygonChainCollision),
    terrain: noManifolds,
    chain: noManifolds,
  },
};

/**
 * Detects the collisions between two {@link CollisionBody} instances,
 * dispatching to the appropriate narrow-phase detector based on each
 * body's collider type.
 *
 * Two convex shapes have at most one manifold between them, but a
 * {@link TerrainCollider}'s surface and a {@link ChainCollider}'s loops are
 * chains of edges rather than single convex shapes, so a body wide enough
 * to straddle several of their edges gets one manifold per edge it touches.
 * Two terrain or chain colliders never collide with each other: neither can
 * be on a dynamic body, so there would be nothing to resolve.
 * @param bodyA - The first body.
 * @param bodyB - The second body.
 * @returns One manifold per contacting feature pair (entity ids not yet
 * populated, normals pointing from `bodyA` toward `bodyB`), or an empty
 * array if the bodies don't overlap.
 */
export function detectCollision(
  bodyA: CollisionBody,
  bodyB: CollisionBody,
): NarrowPhaseManifold[] {
  return collisionDetectors[bodyA.collider.type][bodyB.collider.type](
    bodyA,
    bodyB,
  );
}
