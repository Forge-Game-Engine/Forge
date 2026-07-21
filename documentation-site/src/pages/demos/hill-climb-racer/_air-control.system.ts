import { Time } from '@forge-game-engine/forge/common';
import { EcsSystem } from '@forge-game-engine/forge/ecs';
import { clamp } from '@forge-game-engine/forge/math';
import { AirControlEcsComponent, airControlId } from './_air-control.component';
import { isGrounded } from './_ground-contact.component';

/**
 * While a matched entity's `AirControlEcsComponent.frontWheelGroundContact`
 * and `rearWheelGroundContact` both report their wheel touching no ground,
 * drives `chassisBody`'s angular velocity towards
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
 * sees this tick's grounded state) and before `createPhysicsSyncEcsSystem`
 * (see the Applying Forces guide's registration-order caution).
 * @param time - The time instance used to scale torque by the tick's delta
 * time.
 */
export const createAirControlEcsSystem = (
  time: Time,
): EcsSystem<[AirControlEcsComponent]> => ({
  query: [airControlId],
  run: (result) => {
    const [airControl] = result.components;
    const { frontWheelGroundContact, rearWheelGroundContact } = airControl;

    if (
      isGrounded(frontWheelGroundContact) ||
      isGrounded(rearWheelGroundContact)
    ) {
      return;
    }

    const { chassisBody, throttleInput, maxAngularSpeed, maxTorque } =
      airControl;
    const { deltaTimeInSeconds } = time;

    const responsiveness = chassisBody.inverseInertia * deltaTimeInSeconds;

    if (responsiveness <= 0) {
      return;
    }

    const targetAngularVelocity = throttleInput.value * maxAngularSpeed;

    const desiredTorque =
      (targetAngularVelocity - chassisBody.angularVelocity) / responsiveness;

    const torque = clamp(desiredTorque, -maxTorque, maxTorque);

    chassisBody.applyTorque(torque, deltaTimeInSeconds);
  },
});
