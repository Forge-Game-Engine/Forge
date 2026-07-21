import { createComponentId, EcsWorld } from '@forge-game-engine/forge/ecs';
import { Axis1dAction } from '@forge-game-engine/forge/input';
import { RigidBody } from '@forge-game-engine/forge/physics';

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
   * The chassis this wheel belongs to, used to compute the wheel's rolling
   * angular speed (`-chassisBody.velocity.x / wheelRadius`) that
   * `targetVelocity` is clamped around via `maxSlipAngularSpeed`.
   */
  chassisBody: RigidBody;

  /**
   * This wheel's radius, used for the same rolling-speed conversion as
   * `chassisBody`.
   */
  wheelRadius: number;

  /**
   * The wheel's angular speed, in rad/s, at full throttle (`throttleInput.value`
   * of `1` or `-1`), before `maxSlipAngularSpeed` clamps it. Deliberately
   * much higher than the car could realistically ever roll at - it acts as
   * an "as fast as grip allows" request rather than a speed the wheel is
   * expected to actually reach unassisted.
   */
  maxWheelSpeed: number;

  /**
   * How far past the wheel's current rolling speed (see `chassisBody`)
   * `targetVelocity` is allowed to stray, in rad/s. Without this, a wheel
   * that's ever briefly unloaded - which happens continuously and briefly
   * as the chassis pitches under throttle, see `ChassisStabilizerEcsComponent`
   * - has nothing but its own rotational inertia to resist the motor, and
   * accelerates towards `maxWheelSpeed` almost instantly regardless of
   * whether that speed is at all useful; by the time it regains contact it's
   * spinning far faster than the car is actually moving, wasting torque on
   * pure wheel spin instead of quickly regaining grip. Clamping the target to
   * a bounded slip band around the wheel's actual rolling speed - which
   * tracks the chassis's real velocity every tick - keeps an unloaded wheel
   * from running away, while still leaving enough headroom for the
   * wheel spin a hard launch from a stop should have.
   */
  maxSlipAngularSpeed: number;

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
