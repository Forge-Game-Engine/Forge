import type { Vector2 } from '../../math/index.js';
import type { RigidBody } from '../rigid-body.js';

/**
 * Describes the result of a narrow-phase collision check between two
 * {@link RigidBody} instances.
 */
export interface CollisionManifold {
  /**
   * The first body involved in the collision.
   */
  bodyA: RigidBody;

  /**
   * The second body involved in the collision.
   */
  bodyB: RigidBody;

  /**
   * The collision normal, in world space, pointing from `bodyA` toward
   * `bodyB`.
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
