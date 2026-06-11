import { clamp, type Vector2 } from '../../math/index.js';
import type { RigidBody } from '../rigid-body.js';
import type { CollisionManifold } from './collision-manifold.js';

const PENETRATION_SLOP = 0.01;
const CORRECTION_PERCENT = 0.2;

function relativeVelocityAt(body: RigidBody, contactPoint: Vector2): Vector2 {
  return body.velocity.add(
    contactPoint.perpendicular().multiply(-body.angularVelocity),
  );
}

function applyPositionalCorrection(manifold: CollisionManifold): void {
  const { bodyA, bodyB, normal, depth } = manifold;
  const inverseMassSum = bodyA.inverseMass + bodyB.inverseMass;
  const penetration = Math.max(depth - PENETRATION_SLOP, 0);

  if (inverseMassSum === 0 || penetration === 0) {
    return;
  }

  const correctionMagnitude =
    (penetration / inverseMassSum) * CORRECTION_PERCENT;
  const correction = normal.multiply(correctionMagnitude);

  bodyA.position = bodyA.position.subtract(
    correction.multiply(bodyA.inverseMass),
  );
  bodyB.position = bodyB.position.add(correction.multiply(bodyB.inverseMass));

  // Shrink the manifold's recorded depth by the amount just corrected, so
  // repeated resolution passes within the same step (see
  // `PhysicsWorld._detectAndResolveCollisions`) converge geometrically
  // towards `PENETRATION_SLOP` instead of repeatedly over-correcting based
  // on the original (now stale) depth.
  manifold.depth -= penetration * CORRECTION_PERCENT;
}

/**
 * Resolves a collision between two {@link RigidBody} instances by applying
 * impulse-based normal and friction responses at each contact point, then
 * correcting any residual penetration.
 * @param manifold - The {@link CollisionManifold} describing the collision.
 */
export function resolveCollision(manifold: CollisionManifold): void {
  const { bodyA, bodyB, normal, contactPoints } = manifold;

  for (const contactPoint of contactPoints) {
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

    const restitution = Math.min(bodyA.restitution, bodyB.restitution);
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
