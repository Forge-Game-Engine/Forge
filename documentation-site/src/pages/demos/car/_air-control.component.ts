import { createComponentId, EcsWorld } from '@forge-game-engine/forge/ecs';
import { Axis1dAction } from '@forge-game-engine/forge/input';
import { GroundContactEcsComponent } from './_ground-contact.component';

/**
 * Mid-air pitch control. While both wheels are off the ground, the chassis
 * spins towards `throttleInput * maxAngularSpeed`: gas tilts the nose up,
 * brake tilts it down, and letting go stops the spin.
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
