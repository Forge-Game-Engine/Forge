import { clamp, type Vector2 } from '../../math/index.js';
import type { RigidBody } from '../rigid-body.js';
import type { CollisionManifold } from './collision-manifold.js';

const PENETRATION_SLOP = 0.01;

/**
 * The fraction of penetration depth corrected by each resolution pass
 * (Baumgarte stabilization).
 */
const CORRECTION_PERCENT = 0.2;

/**
 * The maximum total positional-correction distance a single manifold may
 * apply across all of `PhysicsWorld`'s solver iterations within one step.
 * Without this cap, `CORRECTION_PERCENT` compounds over
 * `SOLVER_ITERATIONS` passes (e.g. ~83% of depth per step at 0.2/8
 * iterations), which is aggressive enough that correcting a body out of one
 * overlapping neighbor can push it straight into another, with the next
 * step correcting it back - a stable, non-decaying back-and-forth that reads
 * as constant vibration in dense piles. Capping the per-step total to a
 * small distance (well under typical shape sizes) prevents any single step
 * from overshooting into a different overlap configuration, while still
 * letting deep penetrations resolve gradually over subsequent steps.
 */
const MAX_LINEAR_CORRECTION_PER_STEP = 2;

function relativeVelocityAt(body: RigidBody, contactPoint: Vector2): Vector2 {
  return body.velocity.add(
    contactPoint.perpendicular().multiply(-body.angularVelocity),
  );
}

function applyPositionalCorrection(manifold: CollisionManifold): void {
  const { bodyA, bodyB, normal, depth } = manifold;
  const inverseMassSum = bodyA.inverseMass + bodyB.inverseMass;
  const penetration = Math.max(depth - PENETRATION_SLOP, 0);
  const correctionApplied = manifold.correctionApplied ?? 0;
  const remainingBudget = MAX_LINEAR_CORRECTION_PER_STEP - correctionApplied;

  if (inverseMassSum === 0 || penetration === 0 || remainingBudget <= 0) {
    return;
  }

  const separationGain = Math.min(
    penetration * CORRECTION_PERCENT,
    remainingBudget,
  );
  const correction = normal.multiply(separationGain / inverseMassSum);

  bodyA.position = bodyA.position.subtract(
    correction.multiply(bodyA.inverseMass),
  );
  bodyB.position = bodyB.position.add(correction.multiply(bodyB.inverseMass));

  // Shrink the manifold's recorded depth by the amount just corrected, so
  // repeated resolution passes within the same step (see
  // `PhysicsWorld._detectAndResolveCollisions`) converge geometrically
  // towards `PENETRATION_SLOP` instead of repeatedly over-correcting based
  // on the original (now stale) depth.
  manifold.depth -= separationGain;
  manifold.correctionApplied = correctionApplied + separationGain;
}

/**
 * Resolves a collision between two {@link RigidBody} instances by applying
 * impulse-based normal and friction responses at each contact point, then
 * correcting any residual penetration.
 * @param manifold - The {@link CollisionManifold} describing the collision.
 * @param restingVelocityThreshold - Contacts with a relative normal velocity
 * below this magnitude have their restitution treated as zero. This prevents
 * resting bodies from perpetually bouncing as gravity re-introduces a small
 * normal velocity each step that restitution would otherwise amplify back
 * into motion.
 * @param applyRestitution - Whether restitution should be applied for this
 * pass. Restitution models a single bounce event and should only be applied
 * on the first of {@link PhysicsWorld}'s solver iterations; applying it on
 * every iteration lets contacts repeatedly "bounce" off each other within a
 * single step, injecting energy that shows up as persistent jitter in
 * resting piles.
 */
export function resolveCollision(
  manifold: CollisionManifold,
  restingVelocityThreshold: number,
  applyRestitution: boolean,
  reverseContactOrder = false,
): void {
  const { bodyA, bodyB, normal, contactPoints } = manifold;
  const orderedContactPoints = reverseContactOrder
    ? [...contactPoints].reverse()
    : contactPoints;

  for (const contactPoint of orderedContactPoints) {
    const ra = contactPoint.subtract(bodyA.position);
    const rb = contactPoint.subtract(bodyB.position);

    const relativeVelocity = relativeVelocityAt(bodyB, rb).subtract(
      relativeVelocityAt(bodyA, ra),
    );
    const velocityAlongNormal = relativeVelocity.dot(normal);

    if (velocityAlongNormal > 0) {
      continue;
    }

    const raCrossNormal = ra.cross(normal);
    const rbCrossNormal = rb.cross(normal);
    const normalInverseMassSum =
      bodyA.inverseMass +
      bodyB.inverseMass +
      raCrossNormal * raCrossNormal * bodyA.inverseInertia +
      rbCrossNormal * rbCrossNormal * bodyB.inverseInertia;

    if (normalInverseMassSum === 0) {
      continue;
    }

    const restitution =
      !applyRestitution ||
      Math.abs(velocityAlongNormal) < restingVelocityThreshold
        ? 0
        : Math.min(bodyA.restitution, bodyB.restitution);
    const normalImpulseMagnitude =
      (-(1 + restitution) * velocityAlongNormal) /
      normalInverseMassSum /
      contactPoints.length;

    const normalImpulse = normal.multiply(normalImpulseMagnitude);

    bodyA.applyImpulse(normalImpulse.negate(), ra);
    bodyB.applyImpulse(normalImpulse, rb);

    const tangentRelativeVelocity = relativeVelocityAt(bodyB, rb).subtract(
      relativeVelocityAt(bodyA, ra),
    );
    const tangent = tangentRelativeVelocity
      .subtract(normal.multiply(tangentRelativeVelocity.dot(normal)))
      .normalize();

    const raCrossTangent = ra.cross(tangent);
    const rbCrossTangent = rb.cross(tangent);
    const tangentInverseMassSum =
      bodyA.inverseMass +
      bodyB.inverseMass +
      raCrossTangent * raCrossTangent * bodyA.inverseInertia +
      rbCrossTangent * rbCrossTangent * bodyB.inverseInertia;

    if (tangentInverseMassSum === 0) {
      continue;
    }

    const maxFrictionImpulseMagnitude =
      normalImpulseMagnitude * Math.sqrt(bodyA.friction * bodyB.friction);

    const frictionImpulseMagnitude = clamp(
      -tangentRelativeVelocity.dot(tangent) /
        tangentInverseMassSum /
        contactPoints.length,
      -maxFrictionImpulseMagnitude,
      maxFrictionImpulseMagnitude,
    );

    const frictionImpulse = tangent.multiply(frictionImpulseMagnitude);

    bodyA.applyImpulse(frictionImpulse.negate(), ra);
    bodyB.applyImpulse(frictionImpulse, rb);
  }

  applyPositionalCorrection(manifold);
}
