import { Time } from '@forge-game-engine/forge/common';
import { EcsSystem } from '@forge-game-engine/forge/ecs';
import {
  ChassisStabilizerEcsComponent,
  chassisStabilizerId,
} from './_chassis-stabilizer.component';

/**
 * Applies each matched entity's `ChassisStabilizerEcsComponent` restoring
 * torque to `body` every tick, via `RigidBody.applyTorque`. Must run before
 * `createPhysicsSyncEcsSystem` in the same tick, so the torque applied this
 * tick is reflected in the same tick's `physicsWorld.step` (see the
 * Applying Forces guide's registration-order caution).
 * @param time - The time instance used to scale the torque by the tick's
 * delta time.
 */
export const createChassisStabilizerEcsSystem = (
  time: Time,
): EcsSystem<[ChassisStabilizerEcsComponent]> => ({
  query: [chassisStabilizerId],
  run: (result) => {
    const [stabilizer] = result.components;
    const { body, levelingStiffness, levelingDamping } = stabilizer;
    const { deltaTimeInSeconds } = time;

    const torque =
      -body.angle * levelingStiffness - body.angularVelocity * levelingDamping;

    body.applyTorque(torque, deltaTimeInSeconds);
  },
});
