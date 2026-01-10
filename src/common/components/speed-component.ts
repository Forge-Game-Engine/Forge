import { createComponentId } from '../../new-ecs/ecs-component.js';

/**
 * ECS-style component interface for speed.
 */
export interface SpeedEcsComponent {
  speed: number;
}

export const speedId = createComponentId<SpeedEcsComponent>('speed');
