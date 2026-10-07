import { createComponentId } from '../../ecs/ecs-component.js';
import { EcsWorld } from '../../ecs/ecs-world.js';
import { Vector2 } from '../../math/vector2.js';

/**
 * Fields of {@link GravityEcsComponent} with a sensible default; callers
 * may omit these.
 */
export interface GravityDefaultedOptions {
  /**
   * The acceleration, in world units per second squared, that
   * `createGravityEcsSystem` adds to the entity's
   * `RigidBodyEcsComponent.velocity` every tick, scaled by the tick's
   * duration. Defaults to `(0, -9.81)`.
   */
  amount: Vector2;
}

/**
 * ECS-style component interface for gravity acting on one entity's
 * `'dynamic'` rigid body.
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
    amount: { x: 0, y: -9.81 },
  };

  const component: GravityEcsComponent = {
    ...defaultGravityOptions,
    ...options,
  };

  return world.addComponent(entity, gravityId, component);
}
