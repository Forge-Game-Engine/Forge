import { Time } from '../../common/index.js';
import { EcsSystem } from '../../ecs/ecs-system.js';
import { Vector2 } from '../../math/index.js';
import {
  LinearDamperEcsComponent,
  LinearDamperId,
} from '../components/index.js';
import type { RigidBody } from '../rigid-body.js';

function pointVelocity(body: RigidBody, r: Vector2): Vector2 {
  return body.velocity.add(r.perpendicular().multiply(-body.angularVelocity));
}

/**
 * Creates an ECS system that applies each matched entity's
 * `LinearDamperEcsComponent` resistive force to `bodyA`/`bodyB` every tick:
 * `F = -c * v`, where `v` is the relative velocity of the two anchor points
 * projected onto the line between them (their compression/extension
 * speed), and `c` is `dampingCoefficient`. Relative motion perpendicular to
 * that line is left unaffected. The force is scaled by `deltaTimeInSeconds`
 * and applied via `RigidBody.applyImpulse` (the same continuous-force-via-
 * scaled-impulse pattern used for gravity and wind, see the Applying Forces
 * guide).
 *
 * Must be registered with the `EcsWorld` before `createPhysicsSyncEcsSystem`
 * (or with an earlier `registrationOrder`), so the force applied this tick
 * is reflected in the same tick's `physicsWorld.step`.
 * @param time - The time instance used to scale the force by the tick's
 * delta time.
 */
export const createLinearDamperEcsSystem = (
  time: Time,
): EcsSystem<[LinearDamperEcsComponent], void> => ({
  query: [LinearDamperId],
  run: (result) => {
    const [damper] = result.components;
    const { bodyA, bodyB, anchorA, anchorB, dampingCoefficient } = damper;
    const { deltaTimeInSeconds } = time;

    const rA = anchorA.rotate(bodyA.angle);
    const rB = anchorB.rotate(bodyB.angle);
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
  },
});
