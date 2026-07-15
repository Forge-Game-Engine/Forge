import { createComponentId } from '../../ecs/ecs-component.js';
import { EcsWorld } from '../../ecs/ecs-world.js';

/**
 * Fields of {@link LifetimeEcsComponent} with no sensible default; callers
 * must always provide these.
 */
export interface LifetimeRequiredOptions {
  durationSeconds: number;
}

/**
 * Fields of {@link LifetimeEcsComponent} with a sensible default; callers
 * may omit these.
 */
export interface LifetimeDefaultedOptions {
  elapsedSeconds: number;
  hasExpired: boolean;
}

/**
 * ECS-style component interface for managing entity lifetime.
 */
export interface LifetimeEcsComponent
  extends LifetimeRequiredOptions, LifetimeDefaultedOptions {}

export const lifetimeId = createComponentId<LifetimeEcsComponent>('lifetime');

const defaultLifetimeOptions: LifetimeDefaultedOptions = {
  elapsedSeconds: 0,
  hasExpired: false,
};

/**
 * Attaches a {@link LifetimeEcsComponent} to `entity`.
 * @param world - The ECS world `entity` belongs to.
 * @param entity - The entity to attach the component to.
 * @param options - Options for configuring the lifetime. `durationSeconds`
 * has no sensible default and must always be provided.
 * @returns The attached component, for further tuning or runtime changes.
 */
export function addLifetimeComponent(
  world: EcsWorld,
  entity: number,
  options: LifetimeRequiredOptions & Partial<LifetimeEcsComponent>,
): LifetimeEcsComponent {
  const component: LifetimeEcsComponent = {
    ...defaultLifetimeOptions,
    ...options,
  };

  return world.addComponent(entity, lifetimeId, component);
}
