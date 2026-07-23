import { createComponentId, EcsWorld } from '@forge-game-engine/forge/ecs';
import { Axis1dAction } from '@forge-game-engine/forge/input';
import { RigidBody } from '@forge-game-engine/forge/physics';

/**
 * Marks an entity as a driven wheel: `createWheelDriveEcsSystem` queries for
 * this alongside the entity's `AngularVelocityMotorEcsComponent` and
 * `GroundContactEcsComponent`, and sets the motor's `targetVelocity` and
 * `maxTorque` from `throttleInput` every tick. There's no engine-provided
 * "steer this motor from an input action" component, since what an axis
 * should drive (a wheel, a turret, a slider) is always game-specific - this
 * component plays that role for the demo.
 */
export interface WheelDriveEcsComponent {
  throttleInput: Axis1dAction;

  /**
   * The chassis this wheel belongs to, used to compute the wheel's rolling
   * angular speed (`-chassisBody.velocity.x / wheelRadius`) that
   * `targetVelocity` is clamped around via `maxSlipAngularSpeed` while the
   * wheel is airborne.
   */
  chassisBody: RigidBody;

  /**
   * This wheel's radius, used for the same rolling-speed conversion as
   * `chassisBody`.
   */
  wheelRadius: number;

  /**
   * The wheel's angular speed, in rad/s, at full throttle
   * (`throttleInput.value` of `1` or `-1`) while grounded. The engine's own
   * Coulomb friction model (see `resolveCollision`) is what actually caps
   * how much of this the wheel can turn into real acceleration without
   * slipping - this is deliberately far higher than the car could ever
   * really roll at, an "as fast as grip allows" request rather than a speed
   * the wheel is expected to reach unassisted.
   */
  maxWheelSpeed: number;

  /**
   * How far past the wheel's current rolling speed `targetVelocity` is
   * allowed to stray *while airborne*, in rad/s. A grounded wheel's slip is
   * already correctly limited by ground friction, the same way a real
   * tire's is - but an airborne wheel has no friction at all, nothing but
   * its own rotational inertia to resist the motor, so left unclamped it
   * would accelerate towards `maxWheelSpeed` almost instantly regardless of
   * whether that speed is at all useful, and be spinning far faster than
   * the car is actually moving by the time it lands. This bounds that
   * runaway without limiting how hard a *grounded* wheel can actually
   * accelerate the car.
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
