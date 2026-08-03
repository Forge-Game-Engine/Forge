import { Time } from '../../common/index.js';
import { EcsSystem } from '../../ecs/ecs-system.js';
import {
  AngularVelocityMotorEcsComponent,
  angularVelocityMotorId,
} from '../components/angular-velocity-motor-component.js';
import {
  RigidBodyEcsComponent,
  rigidBodyId,
} from '../components/rigidbody-component.js';

/**
 * Creates an ECS system that drives every entity with an
 * `AngularVelocityMotorEcsComponent` toward `targetVelocity`, clamped by
 * `maxTorque`. Recomputed fresh from the body's current angular velocity
 * every tick (no warm-starting), so it automatically recovers after an
 * external disturbance (a collision, a scripted torque). Order relative to
 * other physics systems doesn't matter beyond running before whatever
 * system integrates velocity into position
 * (`createEulerIntegrationEcsSystem`).
 * @param time - Used to read the tick's delta time.
 * @returns An ECS system that drives every motor-equipped entity's angular
 * velocity every tick.
 */
export const createAngularVelocityMotorEcsSystem = (
  time: Time,
): EcsSystem<[AngularVelocityMotorEcsComponent, RigidBodyEcsComponent]> => ({
  query: [angularVelocityMotorId, rigidBodyId],
  update: (_world, { components: [motors, rigidBodies] }) => {
    const dt = time.deltaTimeInSeconds;

    if (dt <= 0) {
      return;
    }

    for (let i = 0; i < motors.length; i++) {
      const motor = motors[i];
      const rigidBody = rigidBodies[i];

      const velocityError = motor.targetVelocity - rigidBody.angularVelocity;
      const impulse = rigidBody.momentOfInertia * velocityError;
      const maxImpulse = motor.maxTorque * dt;
      const clampedImpulse = Math.max(
        -maxImpulse,
        Math.min(impulse, maxImpulse),
      );

      rigidBody.angularVelocity += clampedImpulse / rigidBody.momentOfInertia;
    }
  },
});
