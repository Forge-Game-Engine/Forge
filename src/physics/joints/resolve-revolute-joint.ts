import { Vector2 } from '../../math/index.js';
import type { RigidBody } from '../rigid-body.js';
import type { RevoluteJoint } from './revolute-joint.js';

const LINEAR_SLOP = 0.01;
const ANGULAR_SLOP = 0.001;

/**
 * The fraction of positional error corrected by each resolution pass
 * (Baumgarte stabilization), matching `resolve-collision.ts`'s
 * `CORRECTION_PERCENT`.
 */
const CORRECTION_PERCENT = 0.2;

interface JointAnchors {
  /**
   * `bodyA`'s anchor, relative to `bodyA.position`, rotated into world
   * space.
   */
  rA: Vector2;

  /**
   * `bodyB`'s anchor, relative to `bodyB.position`, rotated into world
   * space.
   */
  rB: Vector2;
}

function computeAnchors(joint: RevoluteJoint): JointAnchors {
  const { bodyA, bodyB } = joint;

  return {
    rA: joint.localAnchorA.rotate(bodyA.angle),
    rB: joint.localAnchorB.rotate(bodyB.angle),
  };
}

function pointVelocity(body: RigidBody, r: Vector2): Vector2 {
  return body.velocity.add(r.perpendicular().multiply(-body.angularVelocity));
}

/**
 * Solves `K * impulse = -bias` for `impulse`, where `K` is the 2x2 effective
 * mass matrix of the point-to-point constraint between `rA` and `rB`.
 * Couples the two bodies' linear and angular inertia into a single impulse,
 * so (unlike `resolvePrismaticJoint`'s per-axis decomposition) the X and Y
 * components can't be solved independently of each other.
 */
function solvePointImpulse(
  bodyA: RigidBody,
  bodyB: RigidBody,
  rA: Vector2,
  rB: Vector2,
  bias: Vector2,
): Vector2 {
  const inverseMassSum = bodyA.inverseMass + bodyB.inverseMass;

  const k00 =
    inverseMassSum +
    bodyA.inverseInertia * rA.y * rA.y +
    bodyB.inverseInertia * rB.y * rB.y;
  const k01 =
    -bodyA.inverseInertia * rA.x * rA.y - bodyB.inverseInertia * rB.x * rB.y;
  const k11 =
    inverseMassSum +
    bodyA.inverseInertia * rA.x * rA.x +
    bodyB.inverseInertia * rB.x * rB.x;

  const determinant = k00 * k11 - k01 * k01;

  if (determinant === 0) {
    return Vector2.zero;
  }

  const inverseDeterminant = 1 / determinant;

  return new Vector2(
    -inverseDeterminant * (k11 * bias.x - k01 * bias.y),
    -inverseDeterminant * (k00 * bias.y - k01 * bias.x),
  );
}

function solvePointVelocityConstraint(joint: RevoluteJoint): void {
  const { bodyA, bodyB } = joint;
  const { rA, rB } = computeAnchors(joint);

  const relativeVelocity = pointVelocity(bodyB, rB).subtract(
    pointVelocity(bodyA, rA),
  );
  const impulse = solvePointImpulse(bodyA, bodyB, rA, rB, relativeVelocity);

  bodyA.velocity = bodyA.velocity.subtract(impulse.multiply(bodyA.inverseMass));
  bodyA.angularVelocity -= bodyA.inverseInertia * rA.cross(impulse);

  bodyB.velocity = bodyB.velocity.add(impulse.multiply(bodyB.inverseMass));
  bodyB.angularVelocity += bodyB.inverseInertia * rB.cross(impulse);
}

function solveLimitVelocityConstraint(joint: RevoluteJoint): void {
  if (!joint.enableLimit) {
    return;
  }

  const { bodyA, bodyB } = joint;
  const effectiveMass = bodyA.inverseInertia + bodyB.inverseInertia;

  if (effectiveMass === 0) {
    return;
  }

  const angle = joint.angle;
  const atLower = angle <= joint.lowerAngle;
  const atUpper = angle >= joint.upperAngle;

  if (!atLower && !atUpper) {
    return;
  }

  const velocityError = bodyB.angularVelocity - bodyA.angularVelocity;

  // Only resist relative rotation that would push the joint further past the
  // limit it is currently at, symmetric to how `resolveCollision` only
  // resists penetrating normal velocity, never applies a pulling impulse.
  if (atLower && velocityError > 0) {
    return;
  }

  if (atUpper && velocityError < 0) {
    return;
  }

  const impulse = -velocityError / effectiveMass;

  bodyA.angularVelocity -= bodyA.inverseInertia * impulse;
  bodyB.angularVelocity += bodyB.inverseInertia * impulse;
}

function applyPointPositionalCorrection(joint: RevoluteJoint): void {
  const { bodyA, bodyB } = joint;
  const { rA, rB } = computeAnchors(joint);
  const separation = bodyB.position.add(rB).subtract(bodyA.position.add(rA));

  if (separation.magnitude() <= LINEAR_SLOP) {
    return;
  }

  const bias = separation.multiply(CORRECTION_PERCENT);
  const impulse = solvePointImpulse(bodyA, bodyB, rA, rB, bias);

  bodyA.position = bodyA.position.subtract(impulse.multiply(bodyA.inverseMass));
  bodyA.angle -= bodyA.inverseInertia * rA.cross(impulse);

  bodyB.position = bodyB.position.add(impulse.multiply(bodyB.inverseMass));
  bodyB.angle += bodyB.inverseInertia * rB.cross(impulse);
}

function applyLimitPositionalCorrection(joint: RevoluteJoint): void {
  if (!joint.enableLimit) {
    return;
  }

  const { bodyA, bodyB } = joint;
  const inverseInertiaSum = bodyA.inverseInertia + bodyB.inverseInertia;

  if (inverseInertiaSum === 0) {
    return;
  }

  const angle = joint.angle;
  let limitError = 0;

  if (angle < joint.lowerAngle) {
    limitError = angle - joint.lowerAngle;
  } else if (angle > joint.upperAngle) {
    limitError = angle - joint.upperAngle;
  }

  if (Math.abs(limitError) <= ANGULAR_SLOP) {
    return;
  }

  const angularCorrection =
    (limitError * CORRECTION_PERCENT) / inverseInertiaSum;

  bodyA.angle += angularCorrection * bodyA.inverseInertia;
  bodyB.angle -= angularCorrection * bodyB.inverseInertia;
}

/**
 * Resolves a {@link RevoluteJoint} by applying an impulse-based velocity
 * correction that locks the bodies' anchor points together (and clamps
 * relative rotation to the joint's angle limit, if enabled), then correcting
 * any residual positional error. Mirrors `resolveCollision`'s split between
 * a velocity impulse pass and a Baumgarte positional correction pass, so it
 * can be called once per `PhysicsWorld` solver iteration alongside collision
 * resolution.
 * @param joint - The joint to resolve.
 */
export function resolveRevoluteJoint(joint: RevoluteJoint): void {
  solvePointVelocityConstraint(joint);
  solveLimitVelocityConstraint(joint);
  applyPointPositionalCorrection(joint);
  applyLimitPositionalCorrection(joint);
}
