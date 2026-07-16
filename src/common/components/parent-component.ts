import { createComponentId } from '../../ecs/ecs-component.js';
import { EcsWorld } from '../../ecs/ecs-world.js';

/**
 * ECS-style component interface for Parent.
 */
export interface ParentEcsComponent {
  parent: number;
}

export const parentId = createComponentId<ParentEcsComponent>('Parent');

/**
 * Attaches a {@link ParentEcsComponent} to `entity`.
 * @param world - The ECS world `entity` belongs to.
 * @param entity - The entity to attach the component to.
 * @param options - Options for configuring the parent. `parent` (the parent
 * entity's id) has no sensible default and must always be provided.
 * @returns The attached component, for further tuning or runtime changes.
 */
export function addParentComponent(
  world: EcsWorld,
  entity: number,
  options: ParentEcsComponent,
): ParentEcsComponent {
  return world.addComponent(entity, parentId, { ...options });
}
