import { createComponentId, EcsWorld } from '@forge-game-engine/forge/ecs';
import { Color } from '@forge-game-engine/forge/rendering';

/**
 * A sensor zone that tints every ball inside it.
 */
export interface TriggerZoneEcsComponent {
  /** The tint a ball takes while it's inside this zone. */
  color: Color;
}

export const triggerZoneId =
  createComponentId<TriggerZoneEcsComponent>('triggerZone');

/**
 * Attaches a {@link TriggerZoneEcsComponent} to `entity`.
 * @param world - The ECS world `entity` belongs to.
 * @param entity - The entity to attach the component to.
 * @param options - The zone's tint.
 * @returns The attached component.
 */
export function addTriggerZoneComponent(
  world: EcsWorld,
  entity: number,
  options: TriggerZoneEcsComponent,
): TriggerZoneEcsComponent {
  return world.addComponent(entity, triggerZoneId, { ...options });
}
