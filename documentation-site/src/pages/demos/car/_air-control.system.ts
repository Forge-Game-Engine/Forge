import { Time } from '@forge-game-engine/forge/common';
import { EcsSystem } from '@forge-game-engine/forge/ecs';
import { clamp } from '@forge-game-engine/forge/math';
import { applyTorque, rigidBodyId } from '@forge-game-engine/forge/physics';
import { AirControlEcsComponent, airControlId } from './_air-control.component';
import { isGrounded } from './_ground-contact.component';

/**
 * While a matched entity's `AirControlEcsComponent.frontWheelGroundContact`
 * and `rearWheelGroundContact` both report their wheel touching no ground,
 * drives the chassis's angular velocity towards
 * `throttleInput.value * maxAngularSpeed`, spending no more than `maxTorque`
 * to do so - the same targetVelocity/maxTorque approach
 * `createAngularVelocityMotorEcsSystem` uses for the wheels, applied
 * directly here (rather than via `AngularVelocityMotorEcsComponent`) so it
 * only ever acts while airborne; wired onto the wheels' motors instead, a
 * target of `0` at neutral throttle would fight the chassis's ground-level
 * suspension lean too. Does nothing while grounded, leaving the chassis
 * entirely to the suspension and `ChassisStabilizerEcsComponent`.
 *
 * Must run after `createGroundContactEcsSystem` in the same tick (so it
 * sees this tick's grounded state) and before whatever system integrates
 * velocity into position (`createEulerIntegrationEcsSystem`).
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

      const chassisRigidBody = world.getComponent(chassisEntity, rigidBodyId);

      if (chassisRigidBody === null) {
        continue;
      }

      const { deltaTimeInSeconds } = time;

      const responsiveness =
        (1 / chassisRigidBody.momentOfInertia) * deltaTimeInSeconds;

      if (responsiveness <= 0) {
        continue;
      }

      const targetAngularVelocity = throttleInput.value * maxAngularSpeed;

      const desiredTorque =
        (targetAngularVelocity - chassisRigidBody.angularVelocity) /
        responsiveness;

      const torque = clamp(desiredTorque, -maxTorque, maxTorque);

      applyTorque(torque, deltaTimeInSeconds, chassisRigidBody);
    }
  },
});
