import { Vector2 } from '../../math/index.js';
import type { RigidBody } from '../rigid-body.js';

/**
 * Options for creating a {@link PrismaticJoint}.
 */
export interface PrismaticJointOptions {
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
   * The axis `bodyB`'s anchor is constrained to slide along, in `bodyA`'s
   * local space. Rotates with `bodyA`. Does not need to be normalized; it is
   * normalized when the joint is constructed.
   */
  axis?: Vector2;

  /**
   * Whether {@link lowerTranslation}/{@link upperTranslation} are enforced.
   * When `false`, the joint still prevents rotation and translation
   * perpendicular to `axis`, but translation along `axis` is unbounded.
   */
  enableLimit?: boolean;

  /**
   * The minimum allowed {@link PrismaticJoint.translation}. Only enforced
   * when {@link enableLimit} is `true`.
   */
  lowerTranslation?: number;

  /**
   * The maximum allowed {@link PrismaticJoint.translation}. Only enforced
   * when {@link enableLimit} is `true`.
   */
  upperTranslation?: number;
}

const defaultPrismaticJointOptions = {
  anchorA: Vector2.zero,
  anchorB: Vector2.zero,
  axis: Vector2.right,
  enableLimit: false,
  lowerTranslation: 0,
  upperTranslation: 0,
};

/**
 * A constraint that locks two {@link RigidBody} instances together except
 * for a single linear degree of freedom: `bodyB`'s anchor may only slide
 * along an axis fixed to `bodyA`, and the bodies' relative angle is fixed at
 * whatever it was when the joint was created. Used for pistons, elevators,
 * drawers, and other sliding mechanisms. Register with a {@link PhysicsWorld}
 * via `addJoint` for it to be solved every {@link PhysicsWorld.step}.
 */
export class PrismaticJoint {
  public readonly bodyA: RigidBody;

  public readonly bodyB: RigidBody;

  public readonly localAnchorA: Vector2;

  public readonly localAnchorB: Vector2;

  public readonly localAxisA: Vector2;

  /**
   * The relative angle (`bodyB.angle - bodyA.angle`) locked in place by the
   * joint, captured from the bodies' angles at construction time.
   */
  public readonly referenceAngle: number;

  public enableLimit: boolean;

  public lowerTranslation: number;

  public upperTranslation: number;

  /**
   * Creates a new PrismaticJoint instance.
   * @param options - The options for the joint.
   * @throws An error if `axis` is the zero vector, or if `lowerTranslation`
   * is greater than `upperTranslation`.
   */
  constructor(options: PrismaticJointOptions) {
    const {
      bodyA,
      bodyB,
      anchorA,
      anchorB,
      axis,
      enableLimit,
      lowerTranslation,
      upperTranslation,
    } = {
      ...defaultPrismaticJointOptions,
      ...options,
    };

    if (axis.magnitudeSquared() === 0) {
      throw new Error(
        'Unable to create PrismaticJoint, "axis" must not be the zero vector.',
      );
    }

    if (lowerTranslation > upperTranslation) {
      throw new Error(
        `Unable to create PrismaticJoint, "lowerTranslation" (${lowerTranslation}) must not be greater than "upperTranslation" (${upperTranslation}).`,
      );
    }

    this.bodyA = bodyA;
    this.bodyB = bodyB;
    this.localAnchorA = anchorA.clone();
    this.localAnchorB = anchorB.clone();
    this.localAxisA = axis.normalize();
    this.referenceAngle = bodyB.angle - bodyA.angle;
    this.enableLimit = enableLimit;
    this.lowerTranslation = lowerTranslation;
    this.upperTranslation = upperTranslation;
  }

  /**
   * The world-space axis `bodyB`'s anchor slides along, i.e.
   * {@link localAxisA} rotated by `bodyA`'s current angle.
   */
  get axis(): Vector2 {
    return this.localAxisA.rotate(this.bodyA.angle);
  }

  /**
   * The signed distance, along {@link axis}, between the two bodies' anchor
   * points. Zero when the anchors coincide; increases as `bodyB`'s anchor
   * moves further along the positive axis direction from `bodyA`'s anchor.
   */
  get translation(): number {
    const anchorA = this.bodyA.position.add(
      this.localAnchorA.rotate(this.bodyA.angle),
    );
    const anchorB = this.bodyB.position.add(
      this.localAnchorB.rotate(this.bodyB.angle),
    );

    return anchorB.subtract(anchorA).dot(this.axis);
  }
}
