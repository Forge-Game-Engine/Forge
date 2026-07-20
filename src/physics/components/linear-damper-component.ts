import { createComponentId } from '../../ecs/ecs-component.js';
import { EcsWorld } from '../../ecs/ecs-world.js';
import type { LinearDamper } from '../forces/index.js';

/**
 * ECS-style component interface for a {@link LinearDamper}. Register
 * `createLinearDamperEcsSystem` to have the damper's resistive force applied
 * to `bodyA`/`bodyB` every tick while this component's entity exists.
 */
export interface LinearDamperEcsComponent {
  damper: LinearDamper;
}

export const LinearDamperId =
  createComponentId<LinearDamperEcsComponent>('LinearDamper');

/**
 * Attaches a {@link LinearDamperEcsComponent} to `entity`.
 * @param world - The ECS world `entity` belongs to.
 * @param entity - The entity to attach the component to.
 * @param options - Options for configuring the damper. `damper` has no
 * sensible default and must always be provided.
 * @returns The attached component, for further tuning or runtime changes.
 */
export function addLinearDamperComponent(
  world: EcsWorld,
  entity: number,
  options: LinearDamperEcsComponent,
): LinearDamperEcsComponent {
  return world.addComponent(entity, LinearDamperId, { ...options });
}
