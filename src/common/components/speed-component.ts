import { createComponentId } from '../../ecs/ecs-component.js';
import { EcsWorld } from '../../ecs/ecs-world.js';

/**
 * ECS-style component interface for speed.
 */
export interface SpeedEcsComponent {
  speed: number;
}

export const speedId = createComponentId<SpeedEcsComponent>('speed');

const defaultSpeedOptions: SpeedEcsComponent = {
  speed: 0,
};

/**
 * Attaches a {@link SpeedEcsComponent} to `entity`.
 * @param world - The ECS world `entity` belongs to.
 * @param entity - The entity to attach the component to.
 * @param options - Options for configuring the speed.
 * @returns The attached component, for further tuning or runtime changes.
 */
export function addSpeedComponent(
  world: EcsWorld,
  entity: number,
  options: Partial<SpeedEcsComponent> = {},
): SpeedEcsComponent {
  const component: SpeedEcsComponent = {
    ...defaultSpeedOptions,
    ...options,
  };

  return world.addComponent(entity, speedId, component);
}
