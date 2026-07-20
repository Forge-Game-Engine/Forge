import type { LinearSpring } from './linear-spring.js';

/**
 * Applies one step's worth of a {@link LinearSpring}'s restoring force to
 * both connected bodies: `F = -k * x`, where `x` is the signed difference
 * between the spring's current {@link LinearSpring.length} and its
 * `restLength`, and the force acts along the line between the two anchors.
 * The force is scaled by `deltaTimeInSeconds` and applied via
 * `RigidBody.applyImpulse` (the same continuous-force-via-scaled-impulse
 * pattern used for gravity and wind, see the Applying Forces guide), so call
 * this once per step, before `PhysicsWorld.step`, to sustain the spring.
 * @param spring - The spring to apply force for.
 * @param deltaTimeInSeconds - The duration the force acts over.
 */
export function applyLinearSpringForce(
  spring: LinearSpring,
  deltaTimeInSeconds: number,
): void {
  const { bodyA, bodyB, localAnchorA, localAnchorB, restLength, stiffness } =
    spring;

  const rA = localAnchorA.rotate(bodyA.angle);
  const rB = localAnchorB.rotate(bodyB.angle);
  const delta = bodyB.position.add(rB).subtract(bodyA.position.add(rA));
  const length = delta.magnitude();

  if (length === 0) {
    return;
  }

  const direction = delta.multiply(1 / length);
  const displacement = length - restLength;
  const impulse = direction.multiply(
    -stiffness * displacement * deltaTimeInSeconds,
  );

  bodyA.applyImpulse(impulse.multiply(-1), rA);
  bodyB.applyImpulse(impulse, rB);
}
