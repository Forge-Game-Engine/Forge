import { Time } from '../../common/index.js';
import { EcsSystem } from '../../ecs/ecs-system.js';
import {
  vector2Add,
  vector2Clone,
  vector2Divide,
  vector2Magnitude,
  vector2Multiply,
  vector2Negate,
  vector2Rotate,
  vector2Subtract,
} from '../../math/index.js';
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

      // Clone before rotating: `spring.localAnchorA`/`localAnchorB` are
      // persistent component fields reused every tick.
      const rA = vector2Rotate(
        vector2Clone(spring.localAnchorA),
        bodyA.rotation,
      );
      const rB = vector2Rotate(
        vector2Clone(spring.localAnchorB),
        bodyB.rotation,
      );

      // Clone before adding: `bodyA.position`/`bodyB.position` are the
      // entities' live world position.
      const worldAnchorA = vector2Add(vector2Clone(bodyA.position), rA);
      const worldAnchorB = vector2Add(vector2Clone(bodyB.position), rB);

      const delta = vector2Subtract(worldAnchorB, worldAnchorA);
      const length = vector2Magnitude(delta);

      if (length < minAnchorDistance) {
        continue;
      }

      const direction = vector2Divide(delta, length);
      const forceMagnitude = -spring.stiffness * (length - spring.restLength);
      const impulse = vector2Multiply(direction, forceMagnitude * dt);

      // Negate a clone for bodyA: `impulse` is still needed unmodified for
      // bodyB's (opposite-signed) impulse right after.
      applyPointImpulse(
        bodyA.rigidBody,
        rA,
        bodyA.invMass,
        bodyA.invInertia,
        vector2Negate(vector2Clone(impulse)),
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
