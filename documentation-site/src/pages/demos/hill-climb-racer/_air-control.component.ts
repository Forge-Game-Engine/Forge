import { createComponentId, EcsWorld } from '@forge-game-engine/forge/ecs';
import { Axis1dAction } from '@forge-game-engine/forge/input';
import { RigidBody } from '@forge-game-engine/forge/physics';

/**
 * Marks the chassis for Hill-Climb-Racer-style mid-air pitch control:
 * `createAirControlEcsSystem` applies a torque to `chassisBody` from
 * `throttleInput` whenever neither wheel is touching the ground - gas pitches
 * the nose up and back (a counter-clockwise torque), brake pitches it down
 * and forward (a clockwise torque), the same "tilt in the air" control the
 * genre is named for.
 *
 * `frontWheelGroundContacts`/`rearWheelGroundContacts` are maintained by the
 * system itself from `PhysicsWorld.collisionStarts`/`collisionEnds` and
 * shouldn't be set directly; a count rather than a boolean, since a wheel can
 * (and, given how wide the wheels are relative to a ground column, often
 * does) touch two neighboring ground columns at once, and a boolean would
 * flicker "airborne" as one of those two contacts ends while the wheel is
 * still resting on the other.
 */
export interface AirControlEcsComponent {
  chassisBody: RigidBody;
  frontWheelBody: RigidBody;
  rearWheelBody: RigidBody;
  throttleInput: Axis1dAction;

  /**
   * The torque, in N·m, applied to `chassisBody` at full throttle
   * (`throttleInput.value` of `1` or `-1`) while airborne.
   */
  torqueStrength: number;
  frontWheelGroundContacts: number;
  rearWheelGroundContacts: number;
}

export const airControlId =
  createComponentId<AirControlEcsComponent>('airControl');

/**
 * Attaches an {@link AirControlEcsComponent} to `entity`.
 * @param world - The ECS world `entity` belongs to.
 * @param entity - The entity to attach the component to.
 * @param options - Options for configuring air control.
 * `frontWheelGroundContacts`/`rearWheelGroundContacts` are initialized to
 * `0` (grounded) rather than taken from the caller, since they're
 * system-managed state, not configuration.
 * @returns The attached component, for runtime changes (e.g. tuning
 * `torqueStrength`).
 */
export function addAirControlComponent(
  world: EcsWorld,
  entity: number,
  options: Omit<
    AirControlEcsComponent,
    'frontWheelGroundContacts' | 'rearWheelGroundContacts'
  >,
): AirControlEcsComponent {
  return world.addComponent(entity, airControlId, {
    ...options,
    frontWheelGroundContacts: 0,
    rearWheelGroundContacts: 0,
  });
}
