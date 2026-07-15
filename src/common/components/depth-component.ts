import { createComponentId } from '../../ecs/ecs-component.js';
import { EcsWorld } from '../../ecs/ecs-world.js';

/**
 * ECS-style component interface for Depth.
 */
export interface DepthEcsComponent {
  depth: number;
  isDirty: boolean;
}

export const depthId = createComponentId<DepthEcsComponent>('Depth');

const defaultDepthOptions: DepthEcsComponent = {
  depth: 0,
  isDirty: false,
};

/**
 * Attaches a {@link DepthEcsComponent} to `entity`.
 * @param world - The ECS world `entity` belongs to.
 * @param entity - The entity to attach the component to.
 * @param options - Options for configuring the depth.
 * @returns The attached component, for further tuning or runtime changes.
 */
export function addDepthComponent(
  world: EcsWorld,
  entity: number,
  options: Partial<DepthEcsComponent> = {},
): DepthEcsComponent {
  const component: DepthEcsComponent = {
    ...defaultDepthOptions,
    ...options,
  };

  return world.addComponent(entity, depthId, component);
}
