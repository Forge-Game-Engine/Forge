import { createComponentId } from './ecs-component.js';
import type { EcsWorld } from './ecs-world.js';

/**
 * Makes an entity the child of another entity. The child's world transform
 * is composed with its parent's, and removing the parent (with
 * `EcsWorld.removeEntity`) removes the child and the rest of its
 * descendants too. To keep a child alive when its parent goes away, remove
 * the child's `ParentEcsComponent` first.
 *
 * `parent` is read-only because `EcsWorld` indexes each parent's children
 * when the component is added. To reparent an entity, add a new
 * `ParentEcsComponent` to it (it replaces the old one); to detach it, remove
 * the component.
 */
export interface ParentEcsComponent {
  readonly parent: number;
}

export const parentId = createComponentId<ParentEcsComponent>('Parent');

/**
 * Attaches a {@link ParentEcsComponent} to `entity`, replacing any parent it
 * already has.
 * @param world - The ECS world `entity` belongs to.
 * @param entity - The entity to attach the component to.
 * @param options - Options for configuring the parent. `parent` (the parent
 * entity's id) has no sensible default and must always be provided.
 * @returns The attached component.
 */
export function addParentComponent(
  world: EcsWorld,
  entity: number,
  options: ParentEcsComponent,
): ParentEcsComponent {
  return world.addComponent(entity, parentId, { ...options });
}
