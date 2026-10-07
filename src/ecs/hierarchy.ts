import { createComponentId } from './ecs-component.js';

/**
 * An entity's parent in the world's hierarchy. Its transform follows the
 * parent's, and it's removed along with the parent.
 *
 * Only the world writes it: set it with `EcsWorld.setParent` and clear it
 * with `EcsWorld.removeParent`, which keep the world's children index in
 * step. Adding or removing it with `addComponent`/`removeComponent` throws.
 */
export interface ParentEcsComponent {
  /** The parent entity's handle. */
  readonly parent: number;
}

export const parentId = createComponentId<ParentEcsComponent>('Parent');
