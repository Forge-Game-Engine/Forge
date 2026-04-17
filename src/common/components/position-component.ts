import { Vector2 } from '../../math/index.js';
import { createComponentId } from '../../new-ecs/ecs-component.js';

/**
 * ECS-style component interface for position.
 */
export interface PositionEcsComponent {
  local: Vector2;
  world: Vector2;
}

export const positionId = createComponentId<PositionEcsComponent>('position');
