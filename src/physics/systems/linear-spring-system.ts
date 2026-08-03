import { Time } from '../../common/index.js';
import { EcsSystem } from '../../ecs/ecs-system.js';
import {
  LinearSpringEcsComponent,
  linearSpringId,
} from '../components/linear-spring-component.js';
import { applyPointImpulse } from '../joints/apply-point-impulse.js';
import { resolveJointBody } from '../joints/resolve-joint-body.js';

const minAnchorDistance = 1e-6;

/**
 * Creates an ECS system that applies every `LinearSpringEcsComponent`'s
 * Hooke's-law force between its two anchor points, converted to an impulse
 * for the tick (`force * deltaTime`). A pure force generator - like gravity,
 * it has no warm-start state and should run before whatever system resolves
 * hard constraints (`createCollisionResolutionEcsSystem`, joint systems) so
 * they see this tick's spring force reflected in velocity.
 * @param time - Used to read the tick's delta time.
 * @returns An ECS system that applies every spring's force every tick.
 */
export const createLinearSpringEcsSystem = (
  time: Time,
): EcsSystem<[LinearSpringEcsComponent]> => ({
  query: [linearSpringId],
  update: (world, { components: [springs] }) => {
    const dt = time.deltaTimeInSeconds;

    if (dt <= 0) {
      return;
    }

    for (const spring of springs) {
      const bodyA = resolveJointBody(world, spring.entityA);
      const bodyB = resolveJointBody(world, spring.entityB);

      if (bodyA === null || bodyB === null) {
        continue;
      }

      const rA = spring.localAnchorA.rotate(bodyA.rotation);
      const rB = spring.localAnchorB.rotate(bodyB.rotation);

      const worldAnchorA = bodyA.position.add(rA);
      const worldAnchorB = bodyB.position.add(rB);

      const delta = worldAnchorB.subtract(worldAnchorA);
      const length = delta.magnitude();

      if (length < minAnchorDistance) {
        continue;
      }

      const direction = delta.divide(length);
      const forceMagnitude = -spring.stiffness * (length - spring.restLength);
      const impulse = direction.multiply(forceMagnitude * dt);

      applyPointImpulse(
        bodyA.rigidBody,
        rA,
        bodyA.invMass,
        bodyA.invInertia,
        impulse.negate(),
      );
      applyPointImpulse(
        bodyB.rigidBody,
        rB,
        bodyB.invMass,
        bodyB.invInertia,
        impulse,
      );
    }
  },
});
