import { rotationId, Time } from '@forge-game-engine/forge/common';
import { EcsSystem } from '@forge-game-engine/forge/ecs';
import { applyTorque, rigidBodyId } from '@forge-game-engine/forge/physics';
import {
  ChassisStabilizerEcsComponent,
  chassisStabilizerId,
} from './_chassis-stabilizer.component';
import { isGrounded } from './_ground-contact.component';

/**
 * While a matched entity's `ChassisStabilizerEcsComponent.frontWheelGroundContact`
 * or `rearWheelGroundContact` reports its wheel touching the ground, applies
 * the restoring torque to the chassis every tick, via `applyTorque`. Does
 * nothing while both wheels are airborne, leaving the chassis entirely to
 * `AirControlEcsComponent`'s deliberate tilt input.
 *
 * Must run after `createGroundContactEcsSystem` in the same tick (so it
 * sees this tick's grounded state) and before whatever system integrates
 * velocity into position (`createEulerIntegrationEcsSystem`).
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

      applyTorque(torque, deltaTimeInSeconds, chassisRigidBody);
    }
  },
});
