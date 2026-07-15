import { Vector2 } from '../../math/index.js';
import { createComponentId } from '../../ecs/ecs-component.js';
import { EcsWorld } from '../../ecs/ecs-world.js';

/**
 * ECS-style component interface for scale.
 */
export interface ScaleEcsComponent {
  local: Vector2;
  world: Vector2;
}

export const scaleId = createComponentId<ScaleEcsComponent>('scale');

/**
 * Attaches a {@link ScaleEcsComponent} to `entity`.
 * @param world - The ECS world `entity` belongs to.
 * @param entity - The entity to attach the component to.
 * @param options - Options for configuring the scale.
 * @returns The attached component, for further tuning or runtime changes.
 */
export function addScaleComponent(
  world: EcsWorld,
  entity: number,
  options: Partial<ScaleEcsComponent> = {},
): ScaleEcsComponent {
  // `local`/`world` default to fresh Vector2 instances per call (rather
  // than a shared module-level default) since systems mutate them in place.
  const defaultScaleOptions: ScaleEcsComponent = {
    local: Vector2.one,
    world: Vector2.one,
  };

  const component: ScaleEcsComponent = {
    ...defaultScaleOptions,
    ...options,
  };

  return world.addComponent(entity, scaleId, component);
}
