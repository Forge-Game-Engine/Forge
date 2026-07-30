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
}
