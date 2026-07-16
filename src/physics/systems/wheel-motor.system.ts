import { Time } from '../../common/index.js';
import { EcsSystem } from '../../ecs/ecs-system.js';
import { clamp } from '../../math/index.js';
import {
  PhysicsBodyEcsComponent,
  PhysicsBodyId,
} from '../components/physics-body-component.js';
import { WheelMotorEcsComponent, WheelMotorId } from '../components/index.js';

/**
 * Creates an ECS system that drives motorized wheels. Each tick, for every
 * entity with both a `WheelMotorEcsComponent` and a `PhysicsBodyEcsComponent`,
 * applies a torque (bounded by `maxTorque`) to close the gap between the
 * physics body's current `angularVelocity` and the motor's
 * `targetAngularVelocity`.
 *
 * Must be registered with an earlier `SystemRegistrationOrder` than the
 * physics system (see `createPhysicsEcsSystem`), since `physicsWorld.step`
 * runs inside the physics system's `beforeQuery` and consumes and clears
 * each body's torque accumulator. Registering this system afterward applies
 * the motor's torque one tick late.
 * @param time - The time instance used to determine the torque needed to
 * reach the target angular velocity within a single tick.
 */
export const createWheelMotorEcsSystem = (
  time: Time,
): EcsSystem<[WheelMotorEcsComponent, PhysicsBodyEcsComponent]> => ({
  query: [WheelMotorId, PhysicsBodyId],
  run: (result) => {
    if (time.deltaTimeInSeconds <= 0) {
      return;
    }

    const [motorComponent, physicsBodyComponent] = result.components;
    const { physicsBody } = physicsBodyComponent;

    const angularVelocityError =
      motorComponent.targetAngularVelocity - physicsBody.angularVelocity;
    const torqueNeeded =
      (angularVelocityError * physicsBody.inertia) / time.deltaTimeInSeconds;
    const appliedTorque = clamp(
      torqueNeeded,
      -motorComponent.maxTorque,
      motorComponent.maxTorque,
    );

    physicsBody.applyTorque(appliedTorque);
  },
});
