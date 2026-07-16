import { Vector2 } from '../../math/index.js';
import { velocityAt } from '../rigid-body-velocity-at.js';
import type { RigidBody } from '../rigid-body.js';
import type { JointBase } from './joint.js';

/**
 * Options for creating a {@link SpringJoint}.
 */
export interface SpringJointOptions {
  /**
   * The first body connected by the joint.
   */
  bodyA: RigidBody;

  /**
   * The second body connected by the joint.
   */
  bodyB: RigidBody;

  /**
   * The anchor point on `bodyA`, relative to its center of mass in its
   * unrotated local space.
   */
  anchorA?: Vector2;

  /**
   * The anchor point on `bodyB`, relative to its center of mass in its
   * unrotated local space.
   */
  anchorB?: Vector2;

  /**
   * The distance between the world-space anchor points at which the spring
   * exerts no force. Defaults to the distance between the anchors at
   * construction time.
   */
  restLength?: number;

  /**
   * The spring's stiffness (Hooke's law constant). Higher values pull the
   * anchors back toward `restLength` more forcefully. There is no
   * universally sane default; tune relative to the connected bodies' mass
   * and your world's scale.
   */
  stiffness: number;

  /**
   * The spring's damping coefficient, which opposes the rate of change of
   * the distance between anchors. Higher values settle oscillation faster;
   * `0` never settles. There is no universally sane default; tune relative
   * to `stiffness` and the connected bodies' mass.
   */
  damping: number;

  /**
   * Whether `bodyA` and `bodyB` should still collide with each other while
   * connected by this joint.
   */
  collideConnected?: boolean;
}

const defaultSpringJointOptions = {
  anchorA: Vector2.zero,
  anchorB: Vector2.zero,
  collideConnected: false,
};

/**
 * A soft constraint that pulls two {@link RigidBody} anchor points toward a
 * rest distance using a damped spring force, such as a vehicle's
 * suspension. Unlike a {@link DistanceJoint}, a `SpringJoint` compresses and
 * stretches, and never fully locks the anchors at a fixed distance.
 */
export class SpringJoint implements JointBase {
  public readonly type = 'spring';

  public readonly bodyA: RigidBody;

  public readonly bodyB: RigidBody;

  public readonly anchorA: Vector2;

  public readonly anchorB: Vector2;

  public readonly restLength: number;

  public readonly stiffness: number;

  public readonly damping: number;

  public readonly collideConnected: boolean;

  /**
   * Creates a new SpringJoint instance.
   * @param options - The options for the joint.
   */
  constructor(options: SpringJointOptions) {
    const {
      bodyA,
      bodyB,
      anchorA,
      anchorB,
      restLength,
      stiffness,
      damping,
      collideConnected,
    } = {
      ...defaultSpringJointOptions,
      ...options,
    };

    this.bodyA = bodyA;
    this.bodyB = bodyB;
    this.anchorA = anchorA.clone();
    this.anchorB = anchorB.clone();
    this.stiffness = stiffness;
    this.damping = damping;
    this.collideConnected = collideConnected;

    if (restLength !== undefined) {
      this.restLength = restLength;
    } else {
      const worldAnchorA = bodyA.position.add(anchorA.rotate(bodyA.angle));
      const worldAnchorB = bodyB.position.add(anchorB.rotate(bodyB.angle));

      this.restLength = worldAnchorB.subtract(worldAnchorA).magnitude();
    }
  }

  /**
   * Applies this step's spring and damping force to `bodyA` and `bodyB` via
   * {@link RigidBody.applyForce}. Call exactly once per
   * {@link PhysicsWorld} step, alongside gravity and force integration;
   * calling it once per solver iteration would over-apply the spring's
   * stiffness and damping.
   */
  public applyForce(): void {
    const { bodyA, bodyB } = this;
    const ra = this.anchorA.rotate(bodyA.angle);
    const rb = this.anchorB.rotate(bodyB.angle);
    const worldAnchorA = bodyA.position.add(ra);
    const worldAnchorB = bodyB.position.add(rb);

    const delta = worldAnchorB.subtract(worldAnchorA);
    const currentLength = delta.magnitude();

    if (currentLength === 0) {
      return;
    }

    const normal = delta.multiply(1 / currentLength);
    const extension = currentLength - this.restLength;

    const relativeVelocity = velocityAt(bodyB, rb).subtract(
      velocityAt(bodyA, ra),
    );
    const velocityAlongNormal = relativeVelocity.dot(normal);

    const forceMagnitude = -(
      this.stiffness * extension +
      this.damping * velocityAlongNormal
    );
    const forceOnBodyB = normal.multiply(forceMagnitude);

    bodyA.applyForce(forceOnBodyB.negate(), ra);
    bodyB.applyForce(forceOnBodyB, rb);
  }
}
