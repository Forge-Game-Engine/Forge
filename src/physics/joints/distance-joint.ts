import { Vector2 } from '../../math/index.js';
import { velocityAt } from '../rigid-body-velocity-at.js';
import type { RigidBody } from '../rigid-body.js';
import type { JointBase } from './joint.js';

const PENETRATION_SLOP = 0.01;

/**
 * The fraction of positional error corrected by each solve pass (Baumgarte
 * stabilization), mirroring the collision resolver's correction rate.
 */
const CORRECTION_PERCENT = 0.2;

/**
 * Options for creating a {@link DistanceJoint}.
 */
export interface DistanceJointOptions {
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
   * The distance the joint maintains between its world-space anchor points.
   * Defaults to the distance between the anchors at construction time.
   */
  length?: number;

  /**
   * Whether `bodyA` and `bodyB` should still collide with each other while
   * connected by this joint.
   */
  collideConnected?: boolean;
}

const defaultDistanceJointOptions = {
  anchorA: Vector2.zero,
  anchorB: Vector2.zero,
  collideConnected: false,
};

/**
 * A rigid constraint that holds two {@link RigidBody} anchor points at a
 * fixed distance from each other, like a rod. Unlike a {@link SpringJoint},
 * a `DistanceJoint` does not compress or stretch, and does not restrict
 * either body's rotation, since it only constrains the anchor points'
 * positions.
 */
export class DistanceJoint implements JointBase {
  public readonly type = 'distance';

  public readonly bodyA: RigidBody;

  public readonly bodyB: RigidBody;

  public readonly anchorA: Vector2;

  public readonly anchorB: Vector2;

  public readonly length: number;

  public readonly collideConnected: boolean;

  /**
   * Creates a new DistanceJoint instance.
   * @param options - The options for the joint.
   */
  constructor(options: DistanceJointOptions) {
    const { bodyA, bodyB, anchorA, anchorB, length, collideConnected } = {
      ...defaultDistanceJointOptions,
      ...options,
    };

    this.bodyA = bodyA;
    this.bodyB = bodyB;
    this.anchorA = anchorA.clone();
    this.anchorB = anchorB.clone();
    this.collideConnected = collideConnected;

    if (length !== undefined) {
      this.length = length;
    } else {
      const worldAnchorA = bodyA.position.add(anchorA.rotate(bodyA.angle));
      const worldAnchorB = bodyB.position.add(anchorB.rotate(bodyB.angle));

      this.length = worldAnchorB.subtract(worldAnchorA).magnitude();
    }
  }

  /**
   * Solves the joint for the current step: applies a velocity impulse to
   * keep the anchor points from separating further, then a positional
   * correction to close any remaining error. Call once per
   * {@link PhysicsWorld} solver iteration.
   */
  public solve(): void {
    const { bodyA, bodyB, length } = this;
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

    const raCrossNormal = ra.cross(normal);
    const rbCrossNormal = rb.cross(normal);
    const inverseMassSum =
      bodyA.inverseMass +
      bodyB.inverseMass +
      raCrossNormal * raCrossNormal * bodyA.inverseInertia +
      rbCrossNormal * rbCrossNormal * bodyB.inverseInertia;

    if (inverseMassSum === 0) {
      return;
    }

    const relativeVelocity = velocityAt(bodyB, rb).subtract(
      velocityAt(bodyA, ra),
    );
    const impulseMagnitude = -relativeVelocity.dot(normal) / inverseMassSum;
    const impulse = normal.multiply(impulseMagnitude);

    bodyA.applyImpulse(impulse.negate(), ra);
    bodyB.applyImpulse(impulse, rb);

    const positionError = currentLength - length;
    const correctedError =
      Math.sign(positionError) *
      Math.max(Math.abs(positionError) - PENETRATION_SLOP, 0);

    if (correctedError === 0) {
      return;
    }

    const correction = normal.multiply(
      (correctedError * CORRECTION_PERCENT) / inverseMassSum,
    );

    bodyA.position = bodyA.position.add(correction.multiply(bodyA.inverseMass));
    bodyB.position = bodyB.position.subtract(
      correction.multiply(bodyB.inverseMass),
    );
  }
}
