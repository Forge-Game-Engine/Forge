import { EcsSystem } from '@forge-game-engine/forge/ecs';
import { clamp } from '@forge-game-engine/forge/math';
import {
  AngularVelocityMotorEcsComponent,
  AngularVelocityMotorId,
} from '@forge-game-engine/forge/physics';
import { WheelDriveEcsComponent, wheelDriveId } from './_wheel-drive.component';

/**
 * Sets each matched entity's `AngularVelocityMotorEcsComponent.targetVelocity`
 * and `maxTorque` from its `WheelDriveEcsComponent.throttleInput` every tick,
 * so `createAngularVelocityMotorEcsSystem` (registered afterwards) drives the
 * wheel towards it.
 *
 * The sign is flipped: with this engine's Y-up convention, a wheel rolling
 * without slipping to the right (positive world-space x velocity `V`) spins
 * with angular velocity `-V / radius` (positive angular velocity is
 * counter-clockwise, and the bottom contact point of a wheel moving right
 * traces backwards, i.e. clockwise). So driving the car forward (positive
 * throttle, positive x) needs a *negative* target angular velocity.
 *
 * The throttle-desired target is clamped to within `maxSlipAngularSpeed` of
 * the wheel's current rolling speed (`-chassisBody.velocity.x / wheelRadius`)
 * rather than being used directly - see `WheelDriveEcsComponent.maxSlipAngularSpeed`
 * for why an unclamped target lets a briefly-unloaded wheel run away towards
 * `maxWheelSpeed` regardless of whether the car can actually use that speed.
 *
 * `maxTorque` is dropped to `0` whenever `throttleInput.value` is exactly
 * `0`, rather than leaving it at `wheelDrive.maxTorque` and letting
 * `targetVelocity` fall to `0` - at `wheelDrive.maxTorque` (large enough to
 * punch through bumps), driving `targetVelocity` to `0` would brake the
 * wheel to a dead stop the instant the player releases the controls, acting
 * as a permanent parking brake and preventing the car from coasting downhill
 * under gravity. Dropping the torque budget to `0` instead leaves the motor
 * with nothing to push with, so the wheel spins freely at whatever rate
 * rolling contact and gravity give it.
 *
 * Must be registered before `createAngularVelocityMotorEcsSystem` in the
 * same tick, which itself must run before `createPhysicsSyncEcsSystem` (see
 * the Applying Forces guide's registration-order caution).
 */
export const createWheelDriveEcsSystem = (): EcsSystem<
  [WheelDriveEcsComponent, AngularVelocityMotorEcsComponent]
> => ({
  query: [wheelDriveId, AngularVelocityMotorId],
  run: (result) => {
    const [wheelDrive, motor] = result.components;
    const {
      throttleInput,
      chassisBody,
      wheelRadius,
      maxWheelSpeed,
      maxSlipAngularSpeed,
      maxTorque,
    } = wheelDrive;

    const rollingAngularVelocity = -chassisBody.velocity.x / wheelRadius;
    const desiredAngularVelocity = -throttleInput.value * maxWheelSpeed;

    motor.targetVelocity = clamp(
      desiredAngularVelocity,
      rollingAngularVelocity - maxSlipAngularSpeed,
      rollingAngularVelocity + maxSlipAngularSpeed,
    );
    motor.maxTorque = throttleInput.value === 0 ? 0 : maxTorque;
  },
});
