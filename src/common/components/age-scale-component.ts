import { createComponentId } from '../../ecs/ecs-component.js';
import { EcsWorld } from '../../ecs/ecs-world.js';
import { withDefaults } from '../../utilities/with-defaults.js';

/**
 * ECS-style component interface for age-based scaling.
 * `createAgeScaleEcsSystem` sets the entity's local scale by interpolating
 * from the original scale to the final scale over its `LifetimeEcsComponent`.
 */
export interface AgeScaleEcsComponent {
  /** The local x scale at the start of the entity's lifetime. */
  originalScaleX: number;
  /** The local y scale at the start of the entity's lifetime. */
  originalScaleY: number;
  /** The local x scale at the end of the entity's lifetime. */
  finalLifetimeScaleX: number;
  /** The local y scale at the end of the entity's lifetime. */
  finalLifetimeScaleY: number;
}

export const ageScaleId = createComponentId<AgeScaleEcsComponent>('ageScale');

// Defaults to no scale change over the entity's lifetime (original and
// final scale both 1).
const defaultAgeScaleOptions: AgeScaleEcsComponent = {
  originalScaleX: 1,
  originalScaleY: 1,
  finalLifetimeScaleX: 1,
  finalLifetimeScaleY: 1,
};

/**
 * Attaches a {@link AgeScaleEcsComponent} to `entity`.
 * @param world - The ECS world `entity` belongs to.
 * @param entity - The entity to attach the component to.
 * @param options - Options for configuring the age-based scaling.
 * @returns The attached component, for further tuning or runtime changes.
 */
export function addAgeScaleComponent(
  world: EcsWorld,
  entity: number,
  options: Partial<AgeScaleEcsComponent> = {},
): AgeScaleEcsComponent {
  const component: AgeScaleEcsComponent = withDefaults(
    defaultAgeScaleOptions,
    options,
  );

  return world.addComponent(entity, ageScaleId, component);
}
