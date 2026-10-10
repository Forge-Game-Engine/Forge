import { EcsSystem } from '@forge-game-engine/forge/ecs';
import { clamp } from '@forge-game-engine/forge/math';
import {
  AngularVelocityMotorEcsComponent,
  angularVelocityMotorId,
  rigidBodyId,
} from '@forge-game-engine/forge/physics';
import {
  GroundContactEcsComponent,
  groundContactId,
  isGrounded,
} from './_ground-contact.component';
import { WheelDriveEcsComponent, wheelDriveId } from './_wheel-drive.component';

/**
 * Sets each wheel motor's target speed and torque from the throttle.
 *
 * - The sign is flipped: in a Y-up world a wheel rolling right spins
 *   clockwise, which is a negative angle.
 * - On the ground the target is used as is; friction limits the grip.
 * - In the air the target stays close to the wheel's rolling speed.
 * - With no throttle the torque drops to zero, so the car coasts.
 */
export const createWheelDriveEcsSystem = (): EcsSystem<
  [
    WheelDriveEcsComponent,
    AngularVelocityMotorEcsComponent,
    GroundContactEcsComponent,
  ]
> => ({
  query: [wheelDriveId, angularVelocityMotorId, groundContactId],
  update: (world, { components: [wheelDrives, motors, groundContacts] }) => {
    for (let i = 0; i < wheelDrives.length; i++) {
      const wheelDrive = wheelDrives[i];
      const motor = motors[i];
      const groundContact = groundContacts[i];
      const {
        throttleInput,
        chassisEntity,
        wheelRadius,
        maxWheelSpeed,
        maxSlipAngularSpeed,
        maxTorque,
      } = wheelDrive;

      const desiredAngularVelocity = -throttleInput.value * maxWheelSpeed;

      if (isGrounded(groundContact)) {
        motor.targetVelocity = desiredAngularVelocity;
      } else {
        const chassisRigidBody = world.getComponent(chassisEntity, rigidBodyId);
        const chassisVelocityX = chassisRigidBody?.velocity.x ?? 0;
        const rollingAngularVelocity = -chassisVelocityX / wheelRadius;

        motor.targetVelocity = clamp(
          desiredAngularVelocity,
          rollingAngularVelocity - maxSlipAngularSpeed,
          rollingAngularVelocity + maxSlipAngularSpeed,
        );
      }

      motor.maxTorque = throttleInput.value === 0 ? 0 : maxTorque;
    }
  },
});
