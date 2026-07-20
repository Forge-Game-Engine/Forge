import { Vector2 } from '../../math/index.js';
import type { RigidBody } from '../rigid-body.js';

/**
 * Options for creating a {@link LinearSpring}.
 */
export interface LinearSpringOptions {
  /**
   * The first body connected by the spring.
   */
  bodyA: RigidBody;

  /**
   * The second body connected by the spring.
   */
  bodyB: RigidBody;

  /**
   * The anchor point, relative to `bodyA`'s center of mass and unrotated by
   * `bodyA`'s angle (i.e. in `bodyA`'s local space).
   */
  anchorA?: Vector2;

  /**
   * The anchor point, relative to `bodyB`'s center of mass and unrotated by
   * `bodyB`'s angle (i.e. in `bodyB`'s local space).
   */
  anchorB?: Vector2;

  /**
   * The distance between the two anchors at which the spring exerts no
   * force. Defaults to the distance between the anchors at construction
   * time, so a spring built between two bodies already positioned where you
   * want them to rest holds that distance without further tuning.
   */
  restLength?: number;

  /**
   * The spring constant (`k` in Hooke's Law `F = -k * x`), in N/m. Higher
   * values produce a stiffer spring that resists compression/extension away
   * from `restLength` more strongly. Must not be negative.
   */
  stiffness: number;
}

const defaultLinearSpringOptions = {
  anchorA: Vector2.zero,
  anchorB: Vector2.zero,
};

/**
 * A position-based force connecting two {@link RigidBody} instances, pulling
 * or pushing their anchor points towards `restLength` apart along the line
 * between them, per Hooke's Law (`F = -k * x`). Used for vehicle suspension
 * (supporting weight and pushing a wheel back down after a bump), rope-like
 * tethers, and other soft connections.
 *
 * Unlike a joint, a `LinearSpring` is not a hard constraint solved by
 * `PhysicsWorld`; it stores the connection's configuration only. Call
 * `applyLinearSpringForce` once per step to have it act, typically alongside
 * a {@link LinearDamper} sharing the same anchors to dissipate the energy it
 * stores and prevent endless bouncing.
 */
export class LinearSpring {
  public readonly bodyA: RigidBody;

  public readonly bodyB: RigidBody;

  public readonly localAnchorA: Vector2;

  public readonly localAnchorB: Vector2;

  public readonly restLength: number;

  public stiffness: number;

  /**
   * Creates a new LinearSpring instance.
   * @param options - The options for the spring.
   * @throws An error if `stiffness` is negative.
   */
  constructor(options: LinearSpringOptions) {
    const { bodyA, bodyB, anchorA, anchorB, restLength, stiffness } = {
      ...defaultLinearSpringOptions,
      ...options,
    };

    if (stiffness < 0) {
      throw new Error(
        `Unable to create LinearSpring, "stiffness" (${stiffness}) must not be negative.`,
      );
    }

    this.bodyA = bodyA;
    this.bodyB = bodyB;
    this.localAnchorA = anchorA.clone();
    this.localAnchorB = anchorB.clone();
    this.stiffness = stiffness;
    this.restLength = restLength ?? this.length;
  }

  /**
   * `bodyA`'s anchor, in world space.
   */
  get worldAnchorA(): Vector2 {
    return this.bodyA.position.add(this.localAnchorA.rotate(this.bodyA.angle));
  }

  /**
   * `bodyB`'s anchor, in world space.
   */
  get worldAnchorB(): Vector2 {
    return this.bodyB.position.add(this.localAnchorB.rotate(this.bodyB.angle));
  }

  /**
   * The current distance between {@link worldAnchorA} and
   * {@link worldAnchorB}.
   */
  get length(): number {
    return this.worldAnchorB.subtract(this.worldAnchorA).magnitude();
  }
}
