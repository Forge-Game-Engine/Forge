import { Vector2 } from '../../math/index.js';
import type { RigidBody } from '../rigid-body.js';
import type { PrismaticJoint } from './prismatic-joint.js';

const LINEAR_SLOP = 0.01;
const ANGULAR_SLOP = 0.001;

/**
 * The fraction of positional error corrected by each resolution pass
 * (Baumgarte stabilization), matching `resolve-collision.ts`'s
 * `CORRECTION_PERCENT`.
 */
const CORRECTION_PERCENT = 0.2;

interface JointGeometry {
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

  /**
   * The world-space vector from `bodyA`'s anchor to `bodyB`'s anchor.
   */
  d: Vector2;

  /**
   * The world-space unit vector `bodyB`'s anchor is constrained to slide
   * along.
   */
  axis: Vector2;

  /**
   * The world-space unit vector perpendicular to `axis`, along which
   * relative translation is locked to zero.
   */
  perp: Vector2;
}

function computeGeometry(joint: PrismaticJoint): JointGeometry {
  const { bodyA, bodyB } = joint;
  const rA = joint.localAnchorA.rotate(bodyA.angle);
  const rB = joint.localAnchorB.rotate(bodyB.angle);
  const d = bodyB.position.add(rB).subtract(bodyA.position.add(rA));
  const axis = joint.axis;

  return { rA, rB, d, axis, perp: axis.perpendicular() };
}

function pointVelocity(body: RigidBody, r: Vector2): Vector2 {
  return body.velocity.add(r.perpendicular().multiply(-body.angularVelocity));
}

function solvePerpendicularVelocityConstraint(
  joint: PrismaticJoint,
  geometry: JointGeometry,
): void {
  const { bodyA, bodyB } = joint;
  const { rA, rB, d, perp } = geometry;

  const s1 = d.add(rA).cross(perp);
  const s2 = rB.cross(perp);

  const effectiveMass =
    bodyA.inverseMass +
    bodyB.inverseMass +
    bodyA.inverseInertia * s1 * s1 +
    bodyB.inverseInertia * s2 * s2;

  if (effectiveMass === 0) {
    return;
  }

  const relativeVelocity = pointVelocity(bodyB, rB).subtract(
    pointVelocity(bodyA, rA),
  );
  const velocityAlongPerp =
    relativeVelocity.dot(perp) +
    s2 * bodyB.angularVelocity -
    s1 * bodyA.angularVelocity;

  const impulseMagnitude = -velocityAlongPerp / effectiveMass;
  const impulse = perp.multiply(impulseMagnitude);

  bodyA.velocity = bodyA.velocity.subtract(impulse.multiply(bodyA.inverseMass));
  bodyA.angularVelocity -= bodyA.inverseInertia * s1 * impulseMagnitude;

  bodyB.velocity = bodyB.velocity.add(impulse.multiply(bodyB.inverseMass));
  bodyB.angularVelocity += bodyB.inverseInertia * s2 * impulseMagnitude;
}

function solveAngularVelocityConstraint(joint: PrismaticJoint): void {
  const { bodyA, bodyB } = joint;
  const effectiveMass = bodyA.inverseInertia + bodyB.inverseInertia;

  if (effectiveMass === 0) {
    return;
  }

  const velocityError = bodyB.angularVelocity - bodyA.angularVelocity;
  const impulse = -velocityError / effectiveMass;

  bodyA.angularVelocity -= bodyA.inverseInertia * impulse;
  bodyB.angularVelocity += bodyB.inverseInertia * impulse;
}

function solveLimitVelocityConstraint(
  joint: PrismaticJoint,
  geometry: JointGeometry,
): void {
  if (!joint.enableLimit) {
    return;
  }

  const { bodyA, bodyB } = joint;
  const { rA, rB, d, axis } = geometry;

  const translation = d.dot(axis);
  const atLower = translation <= joint.lowerTranslation;
  const atUpper = translation >= joint.upperTranslation;

  if (!atLower && !atUpper) {
    return;
  }

  const a1 = d.add(rA).cross(axis);
  const a2 = rB.cross(axis);

  const effectiveMass =
    bodyA.inverseMass +
    bodyB.inverseMass +
    bodyA.inverseInertia * a1 * a1 +
    bodyB.inverseInertia * a2 * a2;

  if (effectiveMass === 0) {
    return;
  }

  const relativeVelocity = pointVelocity(bodyB, rB).subtract(
    pointVelocity(bodyA, rA),
  );
  const velocityAlongAxis =
    relativeVelocity.dot(axis) +
    a2 * bodyB.angularVelocity -
    a1 * bodyA.angularVelocity;

  // Only resist velocity that would push the joint further past the limit
  // it is currently at, symmetric to how `resolveCollision` only resists
  // penetrating normal velocity, never applies a pulling impulse.
  if (atLower && velocityAlongAxis > 0) {
    return;
  }

  if (atUpper && velocityAlongAxis < 0) {
    return;
  }

  const impulseMagnitude = -velocityAlongAxis / effectiveMass;
  const impulse = axis.multiply(impulseMagnitude);

  bodyA.velocity = bodyA.velocity.subtract(impulse.multiply(bodyA.inverseMass));
  bodyA.angularVelocity -= bodyA.inverseInertia * a1 * impulseMagnitude;

  bodyB.velocity = bodyB.velocity.add(impulse.multiply(bodyB.inverseMass));
  bodyB.angularVelocity += bodyB.inverseInertia * a2 * impulseMagnitude;
}

function applyPositionalCorrection(joint: PrismaticJoint): void {
  const { bodyA, bodyB } = joint;
  const inverseMassSum = bodyA.inverseMass + bodyB.inverseMass;
  const inverseInertiaSum = bodyA.inverseInertia + bodyB.inverseInertia;

  if (inverseMassSum > 0) {
    const { d, axis, perp } = computeGeometry(joint);
    const perpError = d.dot(perp);

    if (Math.abs(perpError) > LINEAR_SLOP) {
      const correction = perp.multiply(
        (perpError * CORRECTION_PERCENT) / inverseMassSum,
      );

      bodyA.position = bodyA.position.add(
        correction.multiply(bodyA.inverseMass),
      );
      bodyB.position = bodyB.position.subtract(
        correction.multiply(bodyB.inverseMass),
      );
    }

    if (joint.enableLimit) {
      const translation = d.dot(axis);
      let limitError = 0;

      if (translation < joint.lowerTranslation) {
        limitError = translation - joint.lowerTranslation;
      } else if (translation > joint.upperTranslation) {
        limitError = translation - joint.upperTranslation;
      }

      if (limitError !== 0) {
        const limitCorrection = axis.multiply(
          (limitError * CORRECTION_PERCENT) / inverseMassSum,
        );

        bodyA.position = bodyA.position.add(
          limitCorrection.multiply(bodyA.inverseMass),
        );
        bodyB.position = bodyB.position.subtract(
          limitCorrection.multiply(bodyB.inverseMass),
        );
      }
    }
  }

  if (inverseInertiaSum > 0) {
    const angleError = bodyB.angle - bodyA.angle - joint.referenceAngle;

    if (Math.abs(angleError) > ANGULAR_SLOP) {
      const angularCorrection =
        (angleError * CORRECTION_PERCENT) / inverseInertiaSum;

      bodyA.angle += angularCorrection * bodyA.inverseInertia;
      bodyB.angle -= angularCorrection * bodyB.inverseInertia;
    }
  }
}

/**
 * Resolves a {@link PrismaticJoint} by applying impulse-based velocity
 * corrections that lock relative rotation and perpendicular translation to
 * zero (and clamp axial translation to the joint's limit, if enabled), then
 * correcting any residual positional error. Mirrors `resolveCollision`'s
 * split between a velocity impulse pass and a Baumgarte positional
 * correction pass, so it can be called once per `PhysicsWorld` solver
 * iteration alongside collision resolution.
 * @param joint - The joint to resolve.
 */
export function resolvePrismaticJoint(joint: PrismaticJoint): void {
  const geometry = computeGeometry(joint);

  solvePerpendicularVelocityConstraint(joint, geometry);
  solveAngularVelocityConstraint(joint);
  solveLimitVelocityConstraint(joint, geometry);
  applyPositionalCorrection(joint);
}
