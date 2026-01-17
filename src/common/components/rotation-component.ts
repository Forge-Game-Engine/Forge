import { createComponentId } from '../../new-ecs/ecs-component.js';

/**
 * ECS-style component interface for rotation.
 */
export interface RotationEcsComponent {
  local: number;
  world: number;
}

export const rotationId = createComponentId<RotationEcsComponent>('rotation');
