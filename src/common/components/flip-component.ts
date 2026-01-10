import { createComponentId } from '../../new-ecs/ecs-component.js';

/**
 * ECS-style component interface for flipping sprites.
 */
export interface FlipEcsComponent {
  flipX: boolean;
  flipY: boolean;
}

export const flipId = createComponentId<FlipEcsComponent>('flip');
