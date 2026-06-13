import { Vector2 } from '../../math/index.js';
import { createComponentId } from '../../ecs/ecs-component.js';

/**
 * ECS-style component interface for position.
 */
export interface PositionEcsComponent {
  local: Vector2;
  world: Vector2;

  /**
   * When `true`, signals to `createTransformEcsSystem` that `local` will
   * never change after it is first computed, so `world` can be computed once
   * and skipped on subsequent frames. This only takes effect once the entity
   * and its entire parent chain (if any) are also static, so a static entity
   * with a moving parent still has its `world` updated every frame.
   *
   * Mutating `local` after `world` has been computed has no effect.
   */
  isStatic?: boolean;
}

export const positionId = createComponentId<PositionEcsComponent>('position');
