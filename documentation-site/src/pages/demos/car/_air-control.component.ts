import { createComponentId, EcsWorld } from '@forge-game-engine/forge/ecs';
import { Axis1dAction } from '@forge-game-engine/forge/input';
import { GroundContactEcsComponent } from './_ground-contact.component';

/**
 * Marks the chassis for mid-air pitch control:
 * `createAirControlEcsSystem` drives the chassis's angular velocity
 * towards a target proportional to `throttleInput` (the same
 * targetVelocity/maxTorque approach `AngularVelocityMotorEcsComponent` uses
 * for the wheels) whenever both `frontWheelGroundContact` and
 * `rearWheelGroundContact` report their wheel touching no ground - gas
 * pitches the nose up and back, brake pitches it down and forward, the same
 * "tilt in the air" control the genre is named for. Driving towards a
 * target angular *velocity*, rather than just applying a constant torque,
 * gives the player direct, bounded control of the rotation rate: releasing
 * the input targets zero rotation and actively cancels existing spin
 * (within `maxTorque`) instead of only bleeding off via the chassis's own
 * angular drag, so a bad rotation can be caught and corrected mid-air
 * rather than fought against.
 *
 * `frontWheelGroundContact`/`rearWheelGroundContact` are each the same
 * `GroundContactEcsComponent` object attached to that wheel's own entity
 * (see `createWheel`) - held here by direct reference rather than joined
 * via an ECS query, since this component lives on the chassis's entity, not
 * either wheel's.
 */
export interface AirControlEcsComponent {
  chassisEntity: number;
  throttleInput: Axis1dAction;
  frontWheelGroundContact: GroundContactEcsComponent;
  rearWheelGroundContact: GroundContactEcsComponent;

  /**
   * The chassis's target angular speed, in rad/s, at full throttle
   * (`throttleInput.value` of `1` or `-1`) while airborne.
   */
  maxAngularSpeed: number;

  /**
   * The maximum torque, in N·m, spent reaching `maxAngularSpeed` in a
   * single tick.
   */
  maxTorque: number;

  /**
   * How long, in seconds, both wheels must have been continuously airborne
   * before this system starts driving the chassis toward
   * `maxAngularSpeed`. This course's hilly, bumpy profile briefly lifts
   * both wheels off the ground constantly at speed, not just off deliberate
   * jumps - without this grace period, holding the accelerate key for
   * ordinary driving (the natural thing to do) reads every one of those
   * brief bumps as "start a backflip," each one adding rotation the
   * suspension/stabilizer then has too little grounded time to level back
   * out before the next bump, compounding into an uncontrolled, ever-faster
   * spin. Set low enough that a genuine jump (well beyond a road bump) still
   * feels immediate.
   */
  minAirborneDuration: number;

  /**
   * How long, in seconds, both wheels have been continuously airborne so
   * far - system-managed state, not configuration; reset to `0` the moment
   * either wheel touches ground again. Starts at `0`.
   */
  airborneDuration: number;
}

export const airControlId =
  createComponentId<AirControlEcsComponent>('airControl');

/**
 * Attaches an {@link AirControlEcsComponent} to `entity`.
 * @param world - The ECS world `entity` belongs to.
 * @param entity - The entity to attach the component to.
 * @param options - Options for configuring air control. `airborneDuration`
 * isn't part of this - it always starts at `0`, since it's system-managed
 * state, not configuration.
 * @returns The attached component, for runtime changes (e.g. tuning
 * `maxAngularSpeed`).
 */
export function addAirControlComponent(
  world: EcsWorld,
  entity: number,
  options: Omit<AirControlEcsComponent, 'airborneDuration'>,
): AirControlEcsComponent {
  return world.addComponent(entity, airControlId, {
    ...options,
    airborneDuration: 0,
  });
}
