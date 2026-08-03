import { createComponentId } from '../../ecs/ecs-component.js';
import { EcsWorld } from '../../ecs/ecs-world.js';
import { createVector2, Vector2 } from '../../math/vector2.js';

/**
 * Fields of {@link GravityEcsComponent} with a sensible default; callers
 * may omit these.
 */
export interface GravityDefaultedOptions {
  amount: Vector2;
}

/**
 * ECS-style component interface for a gravity.
 */
export type GravityEcsComponent = GravityDefaultedOptions;

export const gravityId = createComponentId<GravityEcsComponent>('gravity');

/**
 * Attaches a {@link GravityEcsComponent} to `entity`.
 * @param world - The ECS world `entity` belongs to.
 * @param entity - The entity to attach the component to.
 * @param options - Options for configuring the gravity.
 * @returns The attached component, for further tuning or runtime changes.
 */
export function addGravityComponent(
  world: EcsWorld,
  entity: number,
  options: Partial<GravityEcsComponent> = {},
): GravityEcsComponent {
  const defaultGravityOptions: GravityDefaultedOptions = {
    amount: createVector2(0, -9.81),
  };

  const component: GravityEcsComponent = {
    ...defaultGravityOptions,
    ...options,
  };

  return world.addComponent(entity, gravityId, component);
}
