import { createComponentId, EcsWorld } from '@forge-game-engine/forge/ecs';
import { Axis1dAction } from '@forge-game-engine/forge/input';
import { RigidBody } from '@forge-game-engine/forge/physics';

/**
 * Marks the chassis for Hill-Climb-Racer-style mid-air pitch control:
 * `createAirControlEcsSystem` drives `chassisBody`'s angular velocity
 * towards a target proportional to `throttleInput` (the same
 * targetVelocity/maxTorque approach `AngularVelocityMotorEcsComponent` uses
 * for the wheels) whenever the entity's `GroundContactEcsComponent` reports
 * neither wheel touching the ground - gas pitches the nose up and back,
 * brake pitches it down and forward, the same "tilt in the air" control the
 * genre is named for. Driving towards a target angular *velocity*, rather
 * than just applying a constant torque, gives the player direct, bounded
 * control of the rotation rate: releasing the input targets zero rotation
 * and actively cancels existing spin (within `maxTorque`) instead of only
 * bleeding off via the chassis's own angular drag, so a bad rotation can be
 * caught and corrected mid-air rather than fought against.
 */
export interface AirControlEcsComponent {
  chassisBody: RigidBody;
  throttleInput: Axis1dAction;

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
}

export const airControlId =
  createComponentId<AirControlEcsComponent>('airControl');

/**
 * Attaches an {@link AirControlEcsComponent} to `entity`.
 * @param world - The ECS world `entity` belongs to.
 * @param entity - The entity to attach the component to.
 * @param options - Options for configuring air control.
 * @returns The attached component, for runtime changes (e.g. tuning
 * `maxAngularSpeed`).
 */
export function addAirControlComponent(
  world: EcsWorld,
  entity: number,
  options: AirControlEcsComponent,
): AirControlEcsComponent {
  return world.addComponent(entity, airControlId, { ...options });
}
