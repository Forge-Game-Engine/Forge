import { Time } from '../../common/index.js';
import { EcsSystem } from '../../ecs/ecs-system.js';
import {
  vector2Add,
  vector2Clone,
  vector2Divide,
  vector2Dot,
  vector2Magnitude,
  vector2Multiply,
  vector2Negate,
  vector2Rotate,
  vector2Subtract,
} from '../../math/index.js';
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

      // Clone before rotating: `damper.localAnchorA`/`localAnchorB` are
      // persistent component fields reused every tick.
      const rA = vector2Rotate(
        vector2Clone(damper.localAnchorA),
        bodyA.rotation,
      );
      const rB = vector2Rotate(
        vector2Clone(damper.localAnchorB),
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

      const relativeVelocity = vector2Subtract(
        velocityAtPoint(bodyB.rigidBody, rB),
        velocityAtPoint(bodyA.rigidBody, rA),
      );
      const closingSpeed = vector2Dot(relativeVelocity, direction);
      const forceMagnitude = -damper.dampingCoefficient * closingSpeed;
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
