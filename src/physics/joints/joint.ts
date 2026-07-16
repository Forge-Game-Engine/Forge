import type { RigidBody } from '../rigid-body.js';
import type { DistanceJoint } from './distance-joint.js';
import type { SpringJoint } from './spring-joint.js';

/**
 * The kind of constraint a {@link Joint} represents.
 */
export type JointType = 'distance' | 'spring';

/**
 * Common contract implemented by all joints.
 */
export interface JointBase {
  /**
   * The kind of joint this is, used to dispatch joint solving.
   */
  readonly type: JointType;

  /**
   * The first body connected by this joint.
   */
  readonly bodyA: RigidBody;

  /**
   * The second body connected by this joint.
   */
  readonly bodyB: RigidBody;

  /**
   * Whether {@link bodyA} and {@link bodyB} should still collide with each
   * other while connected by this joint. Defaults to `false`: a joint's
   * bodies typically sit adjacent to, or overlapping, one another by design
   * (for example a suspension connecting a wheel to a chassis), and letting
   * collision resolution fight the joint every step produces visible
   * jitter.
   */
  readonly collideConnected: boolean;
}

/**
 * A constraint between two {@link RigidBody} instances, either a
 * {@link DistanceJoint} or a {@link SpringJoint}.
 */
export type Joint = DistanceJoint | SpringJoint;
