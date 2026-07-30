import { createComponentId } from '../../ecs/ecs-component.js';
import { EcsWorld } from '../../ecs/ecs-world.js';
import { Collider } from '../colliders/collider.js';

export interface ColliderRequiredOptions {
  collider: Collider;
}

export type ColliderEcsComponent = ColliderRequiredOptions;

export const colliderId = createComponentId<ColliderEcsComponent>('collider');

export function addColliderComponent(
  world: EcsWorld,
  entity: number,
  options: ColliderRequiredOptions & Partial<ColliderEcsComponent>,
): ColliderEcsComponent {
  const component: ColliderEcsComponent = {
    ...options,
  };

  return world.addComponent(entity, colliderId, component);
}
