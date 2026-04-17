import { Vector2 } from '../../math/index.js';
import { createComponentId } from '../../new-ecs/ecs-component.js';

/**
 * ECS-style component interface for scale.
 */
export interface ScaleEcsComponent {
  local: Vector2;
  world: Vector2;
}

export const scaleId = createComponentId<ScaleEcsComponent>('scale');
