import { createComponentId } from '../../ecs/ecs-component.js';
import { EcsWorld } from '../../ecs/ecs-world.js';

/**
 * ECS-style component interface for rotation.
 */
export interface RotationEcsComponent {
  local: number;
  world: number;
}

export const rotationId = createComponentId<RotationEcsComponent>('rotation');

const defaultRotationOptions: RotationEcsComponent = {
  local: 0,
  world: 0,
};

/**
 * Attaches a {@link RotationEcsComponent} to `entity`.
 * @param world - The ECS world `entity` belongs to.
 * @param entity - The entity to attach the component to.
 * @param options - Options for configuring the rotation.
 * @returns The attached component, for further tuning or runtime changes.
 */
export function addRotationComponent(
  world: EcsWorld,
  entity: number,
  options: Partial<RotationEcsComponent> = {},
): RotationEcsComponent {
  const component: RotationEcsComponent = {
    ...defaultRotationOptions,
    ...options,
  };

  return world.addComponent(entity, rotationId, component);
}
