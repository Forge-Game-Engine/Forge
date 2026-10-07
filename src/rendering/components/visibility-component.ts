import { createComponentId } from '../../ecs/ecs-component.js';
import { EcsWorld } from '../../ecs/ecs-world.js';
import { withDefaults } from '../../utilities/with-defaults.js';

/**
 * Shows or hides an entity together with everything parented under it.
 * A hidden entity is left out of rendering (its sprite and text draw
 * nothing), out of UI layout groups and content size fitters, out of UI
 * raycasts and focus navigation, and its particle emitters spawn nothing.
 * Its components, and every system that doesn't draw, lay out or take
 * input, keep running.
 *
 * An entity without this component is visible unless an ancestor is
 * hidden. To fade a UI subtree, or switch off its input while it stays
 * drawn, use a `CanvasGroupEcsComponent` instead.
 */
export interface VisibilityEcsComponent {
  /** `false` hides this entity and every descendant. Defaults to `true`. */
  visible: boolean;
}

export const visibilityId =
  createComponentId<VisibilityEcsComponent>('visibility');

const defaultVisibilityOptions: VisibilityEcsComponent = {
  visible: true,
};

/**
 * Attaches a {@link VisibilityEcsComponent} to `entity`.
 * @param world - The ECS world `entity` belongs to.
 * @param entity - The entity to attach the component to.
 * @param options - Options for configuring the visibility.
 * @returns The attached component, for showing and hiding the entity at
 * runtime.
 */
export function addVisibilityComponent(
  world: EcsWorld,
  entity: number,
  options: Partial<VisibilityEcsComponent> = {},
): VisibilityEcsComponent {
  const component: VisibilityEcsComponent = withDefaults(
    defaultVisibilityOptions,
    options,
  );

  return world.addComponent(entity, visibilityId, component);
}

/**
 * Whether `entity` is visible in the hierarchy: `false` if it or any of
 * its ancestors has a {@link VisibilityEcsComponent} with `visible: false`.
 * Walks up the parent chain, so it's computed fresh on every call.
 * @param world - The ECS world `entity` belongs to.
 * @param entity - The entity to check.
 * @returns `true` unless `entity` or an ancestor is hidden.
 */
export function isVisibleInHierarchy(world: EcsWorld, entity: number): boolean {
  const getVisibility =
    world.getComponentAccessor<VisibilityEcsComponent>(visibilityId);

  for (
    let current: number | null = entity;
    current !== null;
    current = world.getParent(current)
  ) {
    if (getVisibility(current)?.visible === false) {
      return false;
    }
  }

  return true;
}
