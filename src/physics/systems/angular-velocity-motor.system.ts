import { Time } from '../../common/index.js';
import { EcsSystem } from '../../ecs/ecs-system.js';
import {
  AngularVelocityMotorEcsComponent,
  AngularVelocityMotorId,
  PhysicsBodyEcsComponent,
  PhysicsBodyId,
} from '../components/index.js';
import { clamp } from '../../math/index.js';

/**
 * Creates an ECS system that drives each matched entity's
 * `PhysicsBodyEcsComponent`'s `RigidBody` towards its
 * `AngularVelocityMotorEcsComponent.targetVelocity` every tick, spending no
 * more torque than `maxTorque` to do so. The torque needed to close the gap
 * to `targetVelocity` in a single tick is computed from the body's inertia
 * and the tick's delta time, then clamped to `[-maxTorque, maxTorque]`
 * before being applied via `RigidBody.applyTorque`.
 *
 * Must be registered with the `EcsWorld` before `createPhysicsEcsSystem` (or
 * with an earlier `registrationOrder`), so the motor's torque is reflected
 * in the same tick's `physicsWorld.step`.
 * @param time - The time instance used to scale torque by the tick's delta
 * time.
 */
export const createAngularVelocityMotorEcsSystem = (
  time: Time,
): EcsSystem<
  [AngularVelocityMotorEcsComponent, PhysicsBodyEcsComponent],
  void
> => ({
  query: [AngularVelocityMotorId, PhysicsBodyId],
  run: (result) => {
    const [motorComponent, physicsBodyComponent] = result.components;
    const { physicsBody } = physicsBodyComponent;
    const { deltaTimeInSeconds } = time;

    const responsiveness = physicsBody.inverseInertia * deltaTimeInSeconds;

    if (responsiveness <= 0) {
      return;
    }

    const desiredTorque =
      (motorComponent.targetVelocity - physicsBody.angularVelocity) /
      responsiveness;

    const torque = clamp(
      desiredTorque,
      -motorComponent.maxTorque,
      motorComponent.maxTorque,
    );

    physicsBody.applyTorque(torque, deltaTimeInSeconds);
  },
});
