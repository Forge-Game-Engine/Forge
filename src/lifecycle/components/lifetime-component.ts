import { createComponentId } from '../../ecs/ecs-component.js';
import { EcsWorld } from '../../ecs/ecs-world.js';
import { withDefaults } from '../../utilities/with-defaults.js';

/**
 * Fields of {@link LifetimeEcsComponent} with no sensible default; callers
 * must always provide these.
 */
export interface LifetimeRequiredOptions {
  /**
   * How long the entity lives, in seconds. The entity expires once
   * `elapsedSeconds` reaches it.
   */
  durationSeconds: number;
}

/**
 * Fields of {@link LifetimeEcsComponent} with a sensible default; callers
 * may omit these.
 */
export interface LifetimeDefaultedOptions {
  /**
   * The seconds counted so far. `createLifetimeTrackingEcsSystem` adds the
   * frame's delta time to it every tick. Defaults to `0`.
   */
  elapsedSeconds: number;

  /**
   * Whether the lifetime has ended. `createLifetimeTrackingEcsSystem` sets
   * it to `true` once `elapsedSeconds` reaches `durationSeconds`, and never
   * sets it back to `false`. Defaults to `false`.
   */
  hasExpired: boolean;
}

/**
 * ECS-style component interface for an entity that expires after a
 * duration. `createLifetimeTrackingEcsSystem` counts its time and sets
 * `hasExpired`; a disposal system, such as `createRemoveFromWorldEcsSystem`,
 * acts on expired entities.
 */
export interface LifetimeEcsComponent
  extends LifetimeRequiredOptions, LifetimeDefaultedOptions {}

/**
 * The key of {@link LifetimeEcsComponent}.
 */
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
  const component: LifetimeEcsComponent = withDefaults(
    defaultLifetimeOptions,
    options,
  );

  return world.addComponent(entity, lifetimeId, component);
}
