import { createComponentId } from '../../ecs/ecs-component.js';
import { EcsWorld } from '../../ecs/ecs-world.js';
import { Collider } from '../colliders/collider.js';

/**
 * Fields of {@link ColliderEcsComponent} with a sensible default; callers
 * may omit these.
 */
export interface ColliderDefaultedOptions {
  /**
   * The Coulomb friction coefficient used when this entity is in contact
   * with another. `createCollisionResolutionEcsSystem` combines two
   * contacting colliders' friction via their geometric mean.
   */
  friction: number;

  /**
   * The restitution (bounciness) coefficient used when this entity is in
   * contact with another. `createCollisionResolutionEcsSystem` combines two
   * contacting colliders' restitution via their geometric mean.
   */
  restitution: number;
}

export interface ColliderRequiredOptions {
  collider: Collider;
}

export interface ColliderEcsComponent
  extends ColliderRequiredOptions, ColliderDefaultedOptions {}

export const colliderId = createComponentId<ColliderEcsComponent>('collider');

export function addColliderComponent(
  world: EcsWorld,
  entity: number,
  options: ColliderRequiredOptions & Partial<ColliderEcsComponent>,
): ColliderEcsComponent {
  const defaultColliderOptions: ColliderDefaultedOptions = {
    friction: 0.6,
    restitution: 0.05,
  };

  const component: ColliderEcsComponent = {
    ...defaultColliderOptions,
    ...options,
  };

  return world.addComponent(entity, colliderId, component);
}
