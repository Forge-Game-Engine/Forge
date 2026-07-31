import { Vector2 } from '../../math/index.js';

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
   * that stay stable across ticks for the same physical contact (e.g. the
   * same polygon edge/vertex pairing), even as the exact point position
   * changes slightly frame to frame. Used by
   * `createCollisionResolutionEcsSystem` to match a contact point up with
   * its persisted solver state so accumulated impulses can be warm-started
   * instead of resolved from zero every tick.
   */
  featureIds: number[];
}
