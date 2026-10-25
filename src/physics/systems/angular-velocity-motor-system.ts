import { Time } from '../../common/index.js';
import { EcsSystem } from '../../ecs/ecs-system.js';
import { canMotorTurnBody } from '../can-motor-turn-body.js';
import {
  AngularVelocityMotorEcsComponent,
  angularVelocityMotorId,
} from '../components/angular-velocity-motor-component.js';
import {
  RigidBodyEcsComponent,
  rigidBodyId,
} from '../components/rigidbody-component.js';
import { isBodyAwake } from '../is-body-awake.js';
import { getRigidBodyMassData } from '../rigid-body-mass-data.js';

/**
 * Creates an ECS system that drives every entity with an
 * `AngularVelocityMotorEcsComponent` toward `targetVelocity`, clamped by
 * `maxTorque`. Recomputed fresh from the body's current angular velocity
 * every step (no warm-starting), so it automatically recovers after an
 * external disturbance (a collision, a scripted torque). Register it after
 * `createSleepEcsSystem` and before whatever system integrates velocity
 * into position (`createEulerIntegrationEcsSystem`); its order relative to
 * the other physics systems doesn't matter. Bodies torque can't turn are
 * skipped: `'static'`/`'kinematic'` bodies (see {@link RigidBodyType}) and
 * `'dynamic'` bodies with `fixedRotation`, as are motors whose `maxTorque`
 * isn't positive.
 *
 * Sleeping bodies are skipped too (see {@link isBodyAwake}). A motor with a
 * non-zero `targetVelocity` keeps its body awake: `createSleepEcsSystem`
 * doesn't count the body as resting, and wakes its island before this
 * system runs when the target is set on a sleeping body. A motor whose
 * `targetVelocity` is `0` (a brake) lets its body fall asleep.
 * @param time - Used to read the step's delta time.
 * @returns An ECS system that drives every motor-equipped entity's angular
 * velocity every step.
 */
export const createAngularVelocityMotorEcsSystem = (
  time: Time,
): EcsSystem<[AngularVelocityMotorEcsComponent, RigidBodyEcsComponent]> => ({
  query: [angularVelocityMotorId, rigidBodyId],
  update: (world, { entities, components: [motors, rigidBodies] }) => {
    const dt = time.deltaTimeInSeconds;

    if (dt <= 0) {
      return;
    }

    for (let i = 0; i < motors.length; i++) {
      const rigidBody = rigidBodies[i];
      const motor = motors[i];

      // A body with no inverse inertia can't be turned by torque. Skipping
      // it also keeps `velocityError / invInertia` from dividing by zero.
      if (
        !canMotorTurnBody(motor, rigidBody) ||
        !isBodyAwake(world, entities[i])
      ) {
        continue;
      }

      const { invInertia } = getRigidBodyMassData(world, entities[i]);
      const velocityError = motor.targetVelocity - rigidBody.angularVelocity;
      const impulse = velocityError / invInertia;
      const maxImpulse = motor.maxTorque * dt;
      const clampedImpulse = Math.max(
        -maxImpulse,
        Math.min(impulse, maxImpulse),
      );

      rigidBody.angularVelocity += clampedImpulse * invInertia;
    }
  },
});
