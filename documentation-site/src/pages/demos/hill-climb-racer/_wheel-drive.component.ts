import { createComponentId, EcsWorld } from '@forge-game-engine/forge/ecs';
import { Axis1dAction } from '@forge-game-engine/forge/input';

/**
 * Marks an entity as a driven wheel: `createWheelDriveEcsSystem` queries for
 * this alongside the entity's `AngularVelocityMotorEcsComponent` and sets
 * the motor's `targetVelocity` and `maxTorque` from `throttleInput` every
 * tick. There's no engine-provided "steer this motor from an input action"
 * component, since what an axis should drive (a wheel, a turret, a slider)
 * is always game-specific - this component plays that role for the demo.
 */
export interface WheelDriveEcsComponent {
  throttleInput: Axis1dAction;

  /**
   * The wheel's angular speed, in rad/s, at full throttle (`throttleInput.value`
   * of `1` or `-1`).
   */
  maxWheelSpeed: number;

  /**
   * The motor's torque budget, in N·m, while `throttleInput` is nonzero.
   * `createWheelDriveEcsSystem` drops the motor's actual `maxTorque` to `0`
   * whenever `throttleInput.value` is exactly `0` instead of driving
   * `targetVelocity` to `0` at this full budget - the latter would brake the
   * wheel to a dead stop the instant the player lets go of the controls
   * (effectively an always-on parking brake), rather than letting it
   * freewheel and coast downhill under gravity the way an idling car does.
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
