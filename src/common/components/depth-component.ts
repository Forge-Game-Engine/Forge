import { createComponentId } from '../../ecs/ecs-component.js';

/**
 * ECS-style component interface for Depth.
 */
export interface DepthEcsComponent {
  depth: number;
  isDirty: boolean;
}

export const depthId = createComponentId<DepthEcsComponent>('Depth');
