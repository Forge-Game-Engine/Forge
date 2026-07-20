import { Vector2 } from '../../math/index.js';
import type { RigidBody } from '../rigid-body.js';
import type { LinearDamper } from './linear-damper.js';

function pointVelocity(body: RigidBody, r: Vector2): Vector2 {
  return body.velocity.add(r.perpendicular().multiply(-body.angularVelocity));
}

/**
 * Applies one step's worth of a {@link LinearDamper}'s resistive force to
 * both connected bodies: `F = -c * v`, where `v` is the relative velocity of
 * the two anchor points projected onto the line between them (their
 * compression/extension speed), and `c` is `dampingCoefficient`. Relative
 * motion perpendicular to that line is left unaffected. The force is scaled
 * by `deltaTimeInSeconds` and applied via `RigidBody.applyImpulse` (the same
 * continuous-force-via-scaled-impulse pattern used for gravity and wind, see
 * the Applying Forces guide), so call this once per step, before
 * `PhysicsWorld.step`, typically alongside a {@link LinearSpring} connecting
 * the same anchors.
 * @param damper - The damper to apply force for.
 * @param deltaTimeInSeconds - The duration the force acts over.
 */
export function applyLinearDamperForce(
  damper: LinearDamper,
  deltaTimeInSeconds: number,
): void {
  const { bodyA, bodyB, localAnchorA, localAnchorB, dampingCoefficient } =
    damper;

  const rA = localAnchorA.rotate(bodyA.angle);
  const rB = localAnchorB.rotate(bodyB.angle);
  const delta = bodyB.position.add(rB).subtract(bodyA.position.add(rA));
  const length = delta.magnitude();

  if (length === 0) {
    return;
  }

  const direction = delta.multiply(1 / length);
  const closingSpeed = pointVelocity(bodyB, rB)
    .subtract(pointVelocity(bodyA, rA))
    .dot(direction);

  const impulse = direction.multiply(
    -dampingCoefficient * closingSpeed * deltaTimeInSeconds,
  );

  bodyA.applyImpulse(impulse.multiply(-1), rA);
  bodyB.applyImpulse(impulse, rB);
}
