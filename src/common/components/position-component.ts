import { Vec2, Vector2 } from '../../math/index.js';
import { createComponentId } from '../../ecs/ecs-component.js';
import { EcsWorld } from '../../ecs/ecs-world.js';
import { withDefaults } from '../../utilities/with-defaults.js';

/**
 * Options for {@link addPositionComponent}.
 */
export interface PositionOptions {
  /**
   * The entity's position relative to its parent, or to the world when it
   * has no parent. This is the value to write when moving the entity.
   */
  local: Vector2;

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

/**
 * ECS-style component interface for position.
 */
export interface PositionEcsComponent extends PositionOptions {
  /**
   * The entity's position in world space. Output only:
   * `createTransformEcsSystem` writes it every frame from `local` and the
   * parent's world transform. It starts out equal to `local`.
   */
  world: Vector2;
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
  options: Partial<PositionOptions> = {},
): PositionEcsComponent {
  // `local` defaults to a fresh Vector2 per call (rather than a shared
  // module-level default) since systems mutate it in place.
  const defaultPositionOptions: PositionOptions = {
    local: Vec2.zero,
  };

  const positionOptions: PositionOptions = withDefaults(
    defaultPositionOptions,
    options,
  );

  return world.addComponent(entity, positionId, {
    ...positionOptions,
    world: Vec2.clone(positionOptions.local),
  });
}
