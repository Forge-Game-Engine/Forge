import { Vector2 } from '../../math/index.js';
import { Collider } from '../colliders/collider.js';

/**
 * The result of a narrow-phase collision check between two entities.
 */
export interface CollisionManifold {
  /**
   * The first entity involved in the collision.
   */
  entityA: number;

  /**
   * The second entity involved in the collision.
   */
  entityB: number;

  /**
   * The shape of `entityA`'s collider this manifold was computed from.
   * `createNarrowPhaseEcsSystem` only reuses a sleeping pair's manifold
   * while both entities still have these exact collider objects, so
   * replacing a collider's shape gets the pair tested again.
   */
  colliderA: Collider;

  /**
   * The shape of `entityB`'s collider this manifold was computed from. See
   * {@link CollisionManifold.colliderA}.
   */
  colliderB: Collider;

  /**
   * The collision normal, in world space, pointing from `entityA` toward
   * `entityB`.
   */
  normal: Vector2;

  /**
   * The penetration depth of the collision, always greater than or equal
   * to zero.
   */
  depth: number;

  /**
   * The world-space contact points of the collision (one or two points).
   */
  contactPoints: Vector2[];

  /**
   * Identifiers for each entry in `contactPoints` (same length, same order)
   * that stay stable across steps for the same physical contact (e.g. the
   * same polygon edge/vertex pairing), even as the exact point position
   * changes slightly step to step. Used by
   * `createCollisionResolutionEcsSystem` to match a contact point up with
   * its persisted solver state so accumulated impulses can be warm-started
   * instead of resolved from zero every step.
   */
  featureIds: number[];
}

/**
 * A {@link CollisionManifold} as produced by the narrow-phase collision
 * detectors, before `createNarrowPhaseEcsSystem` attaches the two colliding
 * entities and their colliders to it.
 */
export type NarrowPhaseManifold = Omit<
  CollisionManifold,
  'entityA' | 'entityB' | 'colliderA' | 'colliderB'
>;
