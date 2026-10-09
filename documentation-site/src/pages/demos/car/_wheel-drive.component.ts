import { createComponentId, EcsWorld } from '@forge-game-engine/forge/ecs';
import { Axis1dAction } from '@forge-game-engine/forge/input';

/**
 * Drives a wheel's motor from the throttle input.
 */
export interface WheelDriveEcsComponent {
  throttleInput: Axis1dAction;

  /** The chassis, whose speed tells how fast the wheel should roll. */
  chassisEntity: number;

  wheelRadius: number;

  /**
   * Wheel spin at full throttle, in rad/s. Deliberately unreachable: ground
   * friction decides how much of it turns into speed.
   */
  maxWheelSpeed: number;

  /**
   * In the air, how far the wheel may spin past its rolling speed, in
   * rad/s. Without it, an airborne wheel spins up uselessly fast.
   */
  maxSlipAngularSpeed: number;

  /**
   * Motor torque while the throttle is held. With no throttle the motor
   * lets go, so the car coasts instead of parking.
   */
  maxTorque: number;
}

export const wheelDriveId =
  createComponentId<WheelDriveEcsComponent>('wheelDrive');

export function addWheelDriveComponent(
  world: EcsWorld,
  entity: number,
  options: WheelDriveEcsComponent,
): WheelDriveEcsComponent {
  return world.addComponent(entity, wheelDriveId, { ...options });
}
