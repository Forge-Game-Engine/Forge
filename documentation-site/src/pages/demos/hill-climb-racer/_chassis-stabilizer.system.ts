import { Time } from '@forge-game-engine/forge/common';
import { EcsSystem } from '@forge-game-engine/forge/ecs';
import {
  ChassisStabilizerEcsComponent,
  chassisStabilizerId,
} from './_chassis-stabilizer.component';
import { isGrounded } from './_ground-contact.component';

/**
 * While a matched entity's `ChassisStabilizerEcsComponent.frontWheelGroundContact`
 * or `rearWheelGroundContact` reports its wheel touching the ground, applies
 * the restoring torque to `body` every tick, via `RigidBody.applyTorque`.
 * Does nothing while both wheels are airborne, leaving the chassis entirely
 * to `AirControlEcsComponent`'s deliberate tilt input.
 *
 * Must run after `createGroundContactEcsSystem` in the same tick (so it
 * sees this tick's grounded state) and before `createPhysicsSyncEcsSystem`
 * (see the Applying Forces guide's registration-order caution).
 * @param time - The time instance used to scale the torque by the tick's
 * delta time.
 */
export const createChassisStabilizerEcsSystem = (
  time: Time,
): EcsSystem<[ChassisStabilizerEcsComponent]> => ({
  query: [chassisStabilizerId],
  run: (result) => {
    const [stabilizer] = result.components;
    const { frontWheelGroundContact, rearWheelGroundContact } = stabilizer;

    if (
      !isGrounded(frontWheelGroundContact) &&
      !isGrounded(rearWheelGroundContact)
    ) {
      return;
    }

    const { body, levelingStiffness, levelingDamping } = stabilizer;
    const { deltaTimeInSeconds } = time;

    const torque =
      -body.angle * levelingStiffness - body.angularVelocity * levelingDamping;

    body.applyTorque(torque, deltaTimeInSeconds);
  },
});
