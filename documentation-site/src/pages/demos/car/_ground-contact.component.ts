import { createComponentId, EcsWorld } from '@forge-game-engine/forge/ecs';

/**
 * Tracks how many static (ground) bodies this entity is currently touching,
 * recomputed every tick by `createGroundContactEcsSystem` from this tick's
 * collision manifolds. A count rather than a boolean, since a wheel can
 * (and, given how wide the wheels are relative to a ground column, often
 * does) touch two neighboring ground columns at once, and a boolean would
 * flicker "airborne" as one of those two contacts ends while the wheel is
 * still resting on the other.
 *
 * Attached directly to the wheel's own entity, so anything else on that
 * same entity (e.g. `WheelDriveEcsComponent`) can query for it jointly.
 * `AirControlEcsComponent`/`ChassisStabilizerEcsComponent` live on a
 * different entity (the chassis) but need to know about *both* wheels, so
 * they instead hold direct references to each wheel's
 * `GroundContactEcsComponent` object.
 */
export interface GroundContactEcsComponent {
  groundContacts: number;
}

export const groundContactId =
  createComponentId<GroundContactEcsComponent>('groundContact');

/**
 * Returns whether `groundContact` currently reports its entity touching no
 * ground.
 * @param groundContact - The ground-contact state to check.
 */
export function isGrounded(groundContact: GroundContactEcsComponent): boolean {
  return groundContact.groundContacts > 0;
}

/**
 * Attaches a {@link GroundContactEcsComponent} to `entity`.
 * @param world - The ECS world `entity` belongs to.
 * @param entity - The entity to attach the component to.
 * @returns The attached component, so it can be handed to other components
 * that need to read this entity's grounded state (see the class doc
 * comment). `groundContacts` starts at `0`, since it's system-managed
 * state, not configuration.
 */
export function addGroundContactComponent(
  world: EcsWorld,
  entity: number,
): GroundContactEcsComponent {
  return world.addComponent(entity, groundContactId, { groundContacts: 0 });
}
