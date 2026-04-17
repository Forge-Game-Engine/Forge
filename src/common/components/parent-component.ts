import { createComponentId } from '../../new-ecs/ecs-component.js';

/**
 * ECS-style component interface for Parent.
 */
export interface ParentEcsComponent {
  parent: number;
}

export const parentId = createComponentId<ParentEcsComponent>('Parent');
