import { Time } from '../../common/index.js';
import { EcsSystem } from '../../ecs/ecs-system.js';
import {
  AppliedTorqueEcsComponent,
  AppliedTorqueId,
  PhysicsBodyEcsComponent,
  PhysicsBodyId,
} from '../components/index.js';

/**
 * Creates an ECS system that applies each matched entity's
 * `AppliedTorqueEcsComponent.value` to its `PhysicsBodyEcsComponent`'s
 * `RigidBody` every tick (via `RigidBody.applyTorque`), then resets `value`
 * back to `0`.
 *
 * Must be registered with the `EcsWorld` before `createPhysicsEcsSystem` (or
 * with an earlier `registrationOrder`), so torque applied this tick is
 * reflected in the same tick's `physicsWorld.step`.
 * @param time - The time instance used to scale torque by the tick's delta
 * time.
 */
export const createAppliedTorqueEcsSystem = (
  time: Time,
): EcsSystem<[AppliedTorqueEcsComponent, PhysicsBodyEcsComponent], void> => ({
  query: [AppliedTorqueId, PhysicsBodyId],
  run: (result) => {
    const [appliedTorqueComponent, physicsBodyComponent] = result.components;

    physicsBodyComponent.physicsBody.applyTorque(
      appliedTorqueComponent.value,
      time.deltaTimeInSeconds,
    );

    appliedTorqueComponent.value = 0;
  },
});
