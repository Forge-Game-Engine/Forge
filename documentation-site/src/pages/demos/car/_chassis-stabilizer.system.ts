import { rotationId, Time } from '@forge-game-engine/forge/common';
import { EcsSystem } from '@forge-game-engine/forge/ecs';
import { applyTorque, rigidBodyId } from '@forge-game-engine/forge/physics';
import {
  ChassisStabilizerEcsComponent,
  chassisStabilizerId,
} from './_chassis-stabilizer.component';
import { isGrounded } from './_ground-contact.component';

/**
 * Applies a spring-like torque towards level while either wheel is on the
 * ground. Does nothing in the air, where air control takes over.
 * @param time - The time instance used to scale the torque by the tick's
 * delta time.
 */
export const createChassisStabilizerEcsSystem = (
  time: Time,
): EcsSystem<[ChassisStabilizerEcsComponent]> => ({
  query: [chassisStabilizerId],
  update: (world, { components: [stabilizers] }) => {
    for (const stabilizer of stabilizers) {
      const { frontWheelGroundContact, rearWheelGroundContact } = stabilizer;

      if (
        !isGrounded(frontWheelGroundContact) &&
        !isGrounded(rearWheelGroundContact)
      ) {
        continue;
      }

      const { chassisEntity, levelingStiffness, levelingDamping } = stabilizer;

      const chassisRotation = world.getComponent(chassisEntity, rotationId);
      const chassisRigidBody = world.getComponent(chassisEntity, rigidBodyId);

      if (chassisRotation === null || chassisRigidBody === null) {
        continue;
      }

      const { deltaTimeInSeconds } = time;

      const torque =
        -chassisRotation.world * levelingStiffness -
        chassisRigidBody.angularVelocity * levelingDamping;

      applyTorque(world, chassisEntity, torque, deltaTimeInSeconds);
    }
  },
});
