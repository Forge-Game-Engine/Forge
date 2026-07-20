import { Time } from '../../common/index.js';
import { EcsSystem } from '../../ecs/ecs-system.js';
import {
  LinearSpringEcsComponent,
  LinearSpringId,
} from '../components/index.js';

/**
 * Creates an ECS system that applies each matched entity's
 * `LinearSpringEcsComponent` restoring force to `bodyA`/`bodyB` every tick:
 * `F = -k * x`, where `x` is the signed difference between the current
 * distance separating the two anchors and `restLength`, acting along the
 * line between them. The force is scaled by `deltaTimeInSeconds` and
 * applied via `RigidBody.applyImpulse` (the same continuous-force-via-
 * scaled-impulse pattern used for gravity and wind, see the Applying Forces
 * guide).
 *
 * Must be registered with the `EcsWorld` before `createPhysicsSyncEcsSystem`
 * (or with an earlier `registrationOrder`), so the force applied this tick
 * is reflected in the same tick's `physicsWorld.step`.
 * @param time - The time instance used to scale the force by the tick's
 * delta time.
 */
export const createLinearSpringEcsSystem = (
  time: Time,
): EcsSystem<[LinearSpringEcsComponent], void> => ({
  query: [LinearSpringId],
  run: (result) => {
    const [spring] = result.components;
    const { bodyA, bodyB, anchorA, anchorB, restLength, stiffness } = spring;
    const { deltaTimeInSeconds } = time;

    const rA = anchorA.rotate(bodyA.angle);
    const rB = anchorB.rotate(bodyB.angle);
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
  },
});
