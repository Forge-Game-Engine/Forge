import { clamp, type Vector2 } from '../../math/index.js';
import type { RigidBody } from '../rigid-body.js';
import type { CollisionManifold } from './collision-manifold.js';

const PENETRATION_SLOP = 0.01;

/**
 * The fraction of penetration depth corrected by {@link applyPositionalCorrection}
 * (Baumgarte stabilization). Applied once per step - see `correctPosition` on
 * {@link resolveCollision} - so this is the actual fraction of a step's
 * penetration that gets corrected, not a per-iteration rate that compounds.
 */
const CORRECTION_PERCENT = 0.5;

/**
 * The maximum positional-correction distance a single manifold may apply in
 * one step, as a fraction of the smaller body's bounding radius (see
 * {@link maxLinearCorrectionPerStep}). This is a safety bound for
 * pathological cases - e.g. a fast-falling body that tunneled deep into a
 * neighbor before contact was detected - rather than the primary defense
 * against overshoot: since positional correction only runs once per step
 * (not on every velocity iteration), `CORRECTION_PERCENT` alone already keeps
 * a typical correction well-behaved. Expressing the cap as a fraction of
 * body size (rather than a fixed distance) keeps it meaningful regardless of
 * how large or small a game's shapes are, and bounding it to a full radius
 * still prevents a single step from moving a body further than its own size.
 */
const MAX_LINEAR_CORRECTION_FRACTION = 1.0;

/**
 * Derives {@link MAX_LINEAR_CORRECTION_FRACTION}'s absolute distance for a
 * manifold, scaled to the smaller of the two bodies' bounding radii.
 * @param manifold - The manifold to derive the cap for.
 * @returns The maximum positional-correction distance for the manifold.
 */
function maxLinearCorrectionPerStep(manifold: CollisionManifold): number {
  const smallerBoundingRadius = Math.min(
    manifold.bodyA.shape.getBoundingRadius(),
    manifold.bodyB.shape.getBoundingRadius(),
  );

  return smallerBoundingRadius * MAX_LINEAR_CORRECTION_FRACTION;
}

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
  const remainingBudget =
    maxLinearCorrectionPerStep(manifold) - correctionApplied;

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

  // Record how much of the depth this call already corrected. Positional
  // correction only runs once per manifold per step (see `correctPosition`
  // on `resolveCollision`), so in practice this simply reflects the amount
  // applied above; it guards against a caller invoking this more than once
  // for the same manifold (e.g. directly, outside `PhysicsWorld`) by capping
  // the combined correction at `maxLinearCorrectionPerStep`.
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
 * @param reverseContactOrder - Whether to resolve this manifold's contact
 * points in reverse order, alternating pass-to-pass to avoid biasing
 * correction toward whichever point happens to be first.
 * @param correctPosition - Whether to run positional correction this call.
 * Should be `true` for only one of {@link PhysicsWorld}'s solver iterations
 * (by convention, the last). `CORRECTION_PERCENT` assumes a single correction
 * per step; running it on every velocity iteration would compound it into a
 * much larger single-step movement, large enough to overshoot a body out of
 * one overlapping neighbor and straight into another, which reads as
 * vibration in dense piles.
 */
export function resolveCollision(
  manifold: CollisionManifold,
  restingVelocityThreshold: number,
  applyRestitution: boolean,
  reverseContactOrder = false,
  correctPosition = true,
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
      (-(1 + restitution) * velocityAlongNormal) / normalInverseMassSum;

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
      -tangentRelativeVelocity.dot(tangent) / tangentInverseMassSum,
      -maxFrictionImpulseMagnitude,
      maxFrictionImpulseMagnitude,
    );

    const frictionImpulse = tangent.multiply(frictionImpulseMagnitude);

    bodyA.applyImpulse(frictionImpulse.negate(), ra);
    bodyB.applyImpulse(frictionImpulse, rb);
  }

  if (correctPosition) {
    applyPositionalCorrection(manifold);
  }
}
