import { Vector2 } from '../../math/index.js';
import type { RigidBody } from '../rigid-body.js';

/**
 * Options for creating a {@link RevoluteJoint}.
 */
export interface RevoluteJointOptions {
  /**
   * The first body connected by the joint.
   */
  bodyA: RigidBody;

  /**
   * The second body connected by the joint.
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
   * Whether {@link lowerAngle}/{@link upperAngle} are enforced. When
   * `false`, the bodies may rotate relative to each other without limit.
   */
  enableLimit?: boolean;

  /**
   * The minimum allowed {@link RevoluteJoint.angle}. Only enforced when
   * {@link enableLimit} is `true`.
   */
  lowerAngle?: number;

  /**
   * The maximum allowed {@link RevoluteJoint.angle}. Only enforced when
   * {@link enableLimit} is `true`.
   */
  upperAngle?: number;
}

const defaultRevoluteJointOptions = {
  anchorA: Vector2.zero,
  anchorB: Vector2.zero,
  enableLimit: false,
  lowerAngle: 0,
  upperAngle: 0,
};

/**
 * A constraint that pins two {@link RigidBody} instances together at a
 * shared anchor point, locking both linear degrees of freedom while leaving
 * relative rotation about that point free. Used for doors, pendulums,
 * wheels, and other hinging mechanisms. Register with a {@link PhysicsWorld}
 * via `addJoint` for it to be solved every {@link PhysicsWorld.step}.
 */
export class RevoluteJoint {
  public readonly bodyA: RigidBody;

  public readonly bodyB: RigidBody;

  public readonly localAnchorA: Vector2;

  public readonly localAnchorB: Vector2;

  /**
   * The relative angle (`bodyB.angle - bodyA.angle`) at construction time,
   * used as the zero point {@link angle} is measured from.
   */
  public readonly referenceAngle: number;

  public enableLimit: boolean;

  public lowerAngle: number;

  public upperAngle: number;

  /**
   * Creates a new RevoluteJoint instance.
   * @param options - The options for the joint.
   * @throws An error if `lowerAngle` is greater than `upperAngle`.
   */
  constructor(options: RevoluteJointOptions) {
    const {
      bodyA,
      bodyB,
      anchorA,
      anchorB,
      enableLimit,
      lowerAngle,
      upperAngle,
    } = {
      ...defaultRevoluteJointOptions,
      ...options,
    };

    if (lowerAngle > upperAngle) {
      throw new Error(
        `Unable to create RevoluteJoint, "lowerAngle" (${lowerAngle}) must not be greater than "upperAngle" (${upperAngle}).`,
      );
    }

    this.bodyA = bodyA;
    this.bodyB = bodyB;
    this.localAnchorA = anchorA.clone();
    this.localAnchorB = anchorB.clone();
    this.referenceAngle = bodyB.angle - bodyA.angle;
    this.enableLimit = enableLimit;
    this.lowerAngle = lowerAngle;
    this.upperAngle = upperAngle;
  }

  /**
   * The relative angle between the bodies, measured from
   * {@link referenceAngle}. Zero at construction time, increases as `bodyB`
   * rotates further counter-clockwise relative to `bodyA` than it started.
   */
  get angle(): number {
    return this.bodyB.angle - this.bodyA.angle - this.referenceAngle;
  }

  /**
   * The world-space anchor point the joint pins the bodies together at,
   * taken as the midpoint of each body's (generally coincident) anchor.
   */
  get anchor(): Vector2 {
    const anchorA = this.bodyA.position.add(
      this.localAnchorA.rotate(this.bodyA.angle),
    );
    const anchorB = this.bodyB.position.add(
      this.localAnchorB.rotate(this.bodyB.angle),
    );

    return anchorA.add(anchorB).multiply(0.5);
  }
}
