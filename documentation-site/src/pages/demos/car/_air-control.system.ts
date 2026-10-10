import { Time } from '@forge-game-engine/forge/common';
import { EcsSystem } from '@forge-game-engine/forge/ecs';
import { clamp } from '@forge-game-engine/forge/math';
import {
  applyTorque,
  getRigidBodyMassData,
} from '@forge-game-engine/forge/physics';
import { AirControlEcsComponent, airControlId } from './_air-control.component';
import { isGrounded } from './_ground-contact.component';

/**
 * While both wheels are airborne, applies the torque that moves the
 * chassis's spin towards the throttle's target speed, capped at `maxTorque`.
 * Does nothing on the ground.
 * @param time - The time instance used to scale torque by the tick's delta
 * time.
 */
export const createAirControlEcsSystem = (
  time: Time,
): EcsSystem<[AirControlEcsComponent]> => ({
  query: [airControlId],
  update: (world, { components: [airControls] }) => {
    for (const airControl of airControls) {
      const { frontWheelGroundContact, rearWheelGroundContact } = airControl;

      if (
        isGrounded(frontWheelGroundContact) ||
        isGrounded(rearWheelGroundContact)
      ) {
        continue;
      }

      const { chassisEntity, throttleInput, maxAngularSpeed, maxTorque } =
        airControl;

      const { rigidBody: chassisRigidBody, invInertia } = getRigidBodyMassData(
        world,
        chassisEntity,
      );

      if (chassisRigidBody === null) {
        continue;
      }

      const { deltaTimeInSeconds } = time;

      const responsiveness = invInertia * deltaTimeInSeconds;

      if (responsiveness <= 0) {
        continue;
      }

      const targetAngularVelocity = throttleInput.value * maxAngularSpeed;

      const desiredTorque =
        (targetAngularVelocity - chassisRigidBody.angularVelocity) /
        responsiveness;

      const torque = clamp(desiredTorque, -maxTorque, maxTorque);

      applyTorque(world, chassisEntity, torque, deltaTimeInSeconds);
    }
  },
});
