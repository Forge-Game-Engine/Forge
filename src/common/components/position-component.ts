import { Vector2 } from '../../math/index.js';
import { createComponentId } from '../../ecs/ecs-component.js';
import { EcsWorld } from '../../ecs/ecs-world.js';

/**
 * Fields of {@link PositionEcsComponent} with a sensible default; callers
 * may omit these.
 */
export interface PositionDefaultedOptions {
  local: Vector2;
  world: Vector2;
}

/**
 * ECS-style component interface for position.
 */
export interface PositionEcsComponent extends PositionDefaultedOptions {
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

/**
 * Attaches a {@link PositionEcsComponent} to `entity`.
 * @param world - The ECS world `entity` belongs to.
 * @param entity - The entity to attach the component to.
 * @param options - Options for configuring the position.
 * @returns The attached component, for further tuning or runtime changes.
 */
export function addPositionComponent(
  world: EcsWorld,
  entity: number,
  options: Partial<PositionEcsComponent> = {},
): PositionEcsComponent {
  // `local`/`world` default to fresh Vector2 instances per call (rather
  // than a shared module-level default) since systems mutate them in place.
  const defaultPositionOptions: PositionDefaultedOptions = {
    local: Vector2.zero,
    world: Vector2.zero,
  };

  const component: PositionEcsComponent = {
    ...defaultPositionOptions,
    ...options,
  };

  return world.addComponent(entity, positionId, component);
}
