import { Vector2 } from '../../math/index.js';
import type { RigidBody } from '../rigid-body.js';

/**
 * Options for creating a {@link LinearDamper}.
 */
export interface LinearDamperOptions {
  /**
   * The first body connected by the damper.
   */
  bodyA: RigidBody;

  /**
   * The second body connected by the damper.
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
   * The damping constant (`c` in `F = -c * v`), in N·s/m. Higher values
   * dissipate the anchors' relative compression/extension speed more
   * strongly. Must not be negative.
   */
  dampingCoefficient: number;
}

const defaultLinearDamperOptions = {
  anchorA: Vector2.zero,
  anchorB: Vector2.zero,
};

/**
 * A velocity-based force connecting two {@link RigidBody} instances, resisting
 * the speed at which their anchor points move towards or away from each
 * other along the line between them, per `F = -c * v`. Used alongside a
 * {@link LinearSpring} sharing the same anchors (a shock absorber pairs with
 * a suspension spring) to dissipate the energy the spring stores and prevent
 * endless bouncing.
 *
 * Unlike a joint, a `LinearDamper` is not a hard constraint solved by
 * `PhysicsWorld`; it stores the connection's configuration only. Call
 * `applyLinearDamperForce` once per step to have it act.
 */
export class LinearDamper {
  public readonly bodyA: RigidBody;

  public readonly bodyB: RigidBody;

  public readonly localAnchorA: Vector2;

  public readonly localAnchorB: Vector2;

  public dampingCoefficient: number;

  /**
   * Creates a new LinearDamper instance.
   * @param options - The options for the damper.
   * @throws An error if `dampingCoefficient` is negative.
   */
  constructor(options: LinearDamperOptions) {
    const { bodyA, bodyB, anchorA, anchorB, dampingCoefficient } = {
      ...defaultLinearDamperOptions,
      ...options,
    };

    if (dampingCoefficient < 0) {
      throw new Error(
        `Unable to create LinearDamper, "dampingCoefficient" (${dampingCoefficient}) must not be negative.`,
      );
    }

    this.bodyA = bodyA;
    this.bodyB = bodyB;
    this.localAnchorA = anchorA.clone();
    this.localAnchorB = anchorB.clone();
    this.dampingCoefficient = dampingCoefficient;
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
