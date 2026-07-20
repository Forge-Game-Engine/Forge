import { createComponentId } from '../../ecs/ecs-component.js';
import { EcsWorld } from '../../ecs/ecs-world.js';
import type { LinearSpring } from '../forces/index.js';

/**
 * ECS-style component interface for a {@link LinearSpring}. Register
 * `createLinearSpringEcsSystem` to have the spring's restoring force applied
 * to `bodyA`/`bodyB` every tick while this component's entity exists.
 */
export interface LinearSpringEcsComponent {
  spring: LinearSpring;
}

export const LinearSpringId =
  createComponentId<LinearSpringEcsComponent>('LinearSpring');

/**
 * Attaches a {@link LinearSpringEcsComponent} to `entity`.
 * @param world - The ECS world `entity` belongs to.
 * @param entity - The entity to attach the component to.
 * @param options - Options for configuring the spring. `spring` has no
 * sensible default and must always be provided.
 * @returns The attached component, for further tuning or runtime changes.
 */
export function addLinearSpringComponent(
  world: EcsWorld,
  entity: number,
  options: LinearSpringEcsComponent,
): LinearSpringEcsComponent {
  return world.addComponent(entity, LinearSpringId, { ...options });
}
