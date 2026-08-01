import { Time } from '../../common/index.js';
import { EcsSystem } from '../../ecs/ecs-system.js';
import {
  LinearDamperEcsComponent,
  linearDamperId,
} from '../components/linear-damper-component.js';
import { applyPointImpulse } from '../joints/apply-point-impulse.js';
import { resolveJointBody } from '../joints/resolve-joint-body.js';
import { velocityAtPoint } from '../joints/velocity-at-point.js';

const minAnchorDistance = 1e-6;

/**
 * Creates an ECS system that applies every `LinearDamperEcsComponent`'s
 * force, opposing the closing velocity between its two anchor points along
 * the line connecting them, converted to an impulse for the tick
 * (`force * deltaTime`). A pure force generator - like gravity, it has no
 * warm-start state and should run before whatever system resolves hard
 * constraints (`createCollisionResolutionEcsSystem`, joint systems) so they
 * see this tick's damping force reflected in velocity.
 * @param time - Used to read the tick's delta time.
 * @returns An ECS system that applies every damper's force every tick.
 */
export const createLinearDamperEcsSystem = (
  time: Time,
): EcsSystem<[LinearDamperEcsComponent]> => ({
  query: [linearDamperId],
  update: (world, { components: [dampers] }) => {
    const dt = time.deltaTimeInSeconds;

    if (dt <= 0) {
      return;
    }

    for (const damper of dampers) {
      const bodyA = resolveJointBody(world, damper.entityA);
      const bodyB = resolveJointBody(world, damper.entityB);

      if (bodyA === null || bodyB === null) {
        continue;
      }

      const rA = damper.localAnchorA.rotate(bodyA.rotation);
      const rB = damper.localAnchorB.rotate(bodyB.rotation);

      const worldAnchorA = bodyA.position.add(rA);
      const worldAnchorB = bodyB.position.add(rB);

      const delta = worldAnchorB.subtract(worldAnchorA);
      const length = delta.magnitude();

      if (length < minAnchorDistance) {
        continue;
      }

      const direction = delta.divide(length);

      const relativeVelocity = velocityAtPoint(bodyB.rigidBody, rB).subtract(
        velocityAtPoint(bodyA.rigidBody, rA),
      );
      const closingSpeed = relativeVelocity.dot(direction);
      const forceMagnitude = -damper.dampingCoefficient * closingSpeed;
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
