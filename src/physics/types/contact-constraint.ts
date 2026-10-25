import { Vector2 } from '../../math/index.js';

/**
 * Persistent, per-contact-point solver state for a single collision
 * contact, carried across steps (matched up by `entityA`/`entityB`/
 * `featureId`) so `createCollisionResolutionEcsSystem` can warm-start its
 * accumulated impulses instead of resolving every contact from zero every
 * step.
 */
export interface ContactConstraint {
  entityA: number;
  entityB: number;

  /**
   * Identifies which of `entityA`/`entityB`'s contact points this
   * constraint tracks. See {@link CollisionManifold.featureIds}.
   */
  featureId: number;

  /**
   * The current step's contact normal, in world space, pointing from
   * `entityA` toward `entityB`.
   */
  normal: Vector2;

  /**
   * The current step's friction direction, perpendicular to `normal`.
   */
  tangent: Vector2;

  /**
   * The current step's world-space contact point.
   */
  point: Vector2;

  /**
   * The current step's penetration depth.
   */
  penetration: number;

  /**
   * The combined (geometric mean) Coulomb friction coefficient of the two
   * contacting colliders.
   */
  friction: number;

  /**
   * The combined (geometric mean) restitution coefficient of the two
   * contacting colliders.
   */
  restitution: number;

  /**
   * The relative velocity of the two bodies along `normal`, sampled before
   * this step's solve (and before warm-starting is applied), for use by the
   * restitution pass.
   */
  relativeVelocity: number;

  /**
   * The total normal impulse accumulated across solver iterations, carried
   * across steps for warm-starting. Always `>= 0`.
   */
  accumulatedNormalImpulse: number;

  /**
   * The total friction impulse accumulated across solver iterations,
   * carried across steps for warm-starting. Clamped to
   * `[-friction * accumulatedNormalImpulse, friction * accumulatedNormalImpulse]`.
   */
  accumulatedTangentImpulse: number;

  /**
   * `true` when this constraint was matched to (and is continuing) a
   * contact that already existed on the previous step; `false` for a
   * contact appearing for the first time this step. Restitution only
   * applies to non-reused contacts, so a resting contact doesn't keep
   * bouncing every step.
   */
  isReused: boolean;
}
