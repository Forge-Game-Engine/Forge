import { createComponentId, EcsWorld } from '@forge-game-engine/forge/ecs';

/**
 * How many static (ground) bodies this wheel is touching. Updated every
 * tick by `createGroundContactEcsSystem`.
 */
export interface GroundContactEcsComponent {
  groundContacts: number;
}

export const groundContactId =
  createComponentId<GroundContactEcsComponent>('groundContact');

/**
 * Returns whether the entity is touching the ground.
 */
export function isGrounded(groundContact: GroundContactEcsComponent): boolean {
  return groundContact.groundContacts > 0;
}

/**
 * Attaches a {@link GroundContactEcsComponent} to `entity`.
 * @returns The component, so the chassis's components can read it too.
 */
export function addGroundContactComponent(
  world: EcsWorld,
  entity: number,
): GroundContactEcsComponent {
  return world.addComponent(entity, groundContactId, { groundContacts: 0 });
}
