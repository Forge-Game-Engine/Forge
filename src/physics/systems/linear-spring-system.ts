import { Time } from '../../common/index.js';
import { EcsSystem } from '../../ecs/ecs-system.js';
import { Vec2 } from '../../math/index.js';
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
      const rA = Vec2.rotate(Vec2.clone(spring.localAnchorA), bodyA.rotation);
      const rB = Vec2.rotate(Vec2.clone(spring.localAnchorB), bodyB.rotation);

      // Clone before adding: `bodyA.position`/`bodyB.position` are the
      // entities' live world position.
      const worldAnchorA = Vec2.add(Vec2.clone(bodyA.position), rA);
      const worldAnchorB = Vec2.add(Vec2.clone(bodyB.position), rB);

      const delta = Vec2.subtract(worldAnchorB, worldAnchorA);
      const length = Vec2.magnitude(delta);

      if (length < minAnchorDistance) {
        continue;
      }

      const direction = Vec2.divide(delta, length);
      const forceMagnitude = -spring.stiffness * (length - spring.restLength);
      const impulse = Vec2.multiply(direction, forceMagnitude * dt);

      // Negate a clone for bodyA: `impulse` is still needed unmodified for
      // bodyB's (opposite-signed) impulse right after.
      applyPointImpulse(
        bodyA.rigidBody,
        rA,
        bodyA.invMass,
        bodyA.invInertia,
        Vec2.negate(Vec2.clone(impulse)),
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
