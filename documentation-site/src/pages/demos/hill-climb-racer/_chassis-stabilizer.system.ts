import { Time } from '@forge-game-engine/forge/common';
import { EcsSystem } from '@forge-game-engine/forge/ecs';
import {
  ChassisStabilizerEcsComponent,
  chassisStabilizerId,
} from './_chassis-stabilizer.component';
import {
  GroundContactEcsComponent,
  groundContactId,
  isAirborne,
} from './_ground-contact.component';

/**
 * While a matched entity's `GroundContactEcsComponent` reports at least one
 * wheel touching the ground, applies its `ChassisStabilizerEcsComponent`
 * restoring torque to `body` every tick, via `RigidBody.applyTorque`. Does
 * nothing while airborne, leaving the chassis entirely to
 * `AirControlEcsComponent`'s deliberate tilt input.
 *
 * Must run after `createGroundContactEcsSystem` in the same tick (so it
 * sees this tick's grounded state) and before `createPhysicsSyncEcsSystem`
 * (see the Applying Forces guide's registration-order caution).
 * @param time - The time instance used to scale the torque by the tick's
 * delta time.
 */
export const createChassisStabilizerEcsSystem = (
  time: Time,
): EcsSystem<[ChassisStabilizerEcsComponent, GroundContactEcsComponent]> => ({
  query: [chassisStabilizerId, groundContactId],
  run: (result) => {
    const [stabilizer, groundContact] = result.components;

    if (isAirborne(groundContact)) {
      return;
    }

    const { body, levelingStiffness, levelingDamping } = stabilizer;
    const { deltaTimeInSeconds } = time;

    const torque =
      -body.angle * levelingStiffness - body.angularVelocity * levelingDamping;

    body.applyTorque(torque, deltaTimeInSeconds);
  },
});
