import { createComponentId } from '../../ecs/ecs-component.js';
import { EcsWorld } from '../../ecs/ecs-world.js';

/**
 * Fields of {@link UiToggleGroupEcsComponent} with a sensible default;
 * callers may omit these.
 */
export interface UiToggleGroupDefaultedOptions {
  /**
   * Whether every toggle in this group can be off at once. `false` (the
   * default) gives radio-button behavior: exactly one toggle in the group is
   * always on, and clicking the currently-on one is a no-op (there's no
   * "unselect" gesture). `true` still enforces mutual exclusivity - turning
   * one toggle on turns the others off - but allows the last one to be
   * clicked off, leaving none on.
   */
  allowSwitchOff: boolean;
}

export type UiToggleGroupEcsComponent = UiToggleGroupDefaultedOptions;

export const uiToggleGroupId =
  createComponentId<UiToggleGroupEcsComponent>('uiToggleGroup');

const defaultUiToggleGroupOptions: UiToggleGroupDefaultedOptions = {
  allowSwitchOff: false,
};

/**
 * Attaches a {@link UiToggleGroupEcsComponent} to `entity`, making it a
 * radio-group root: any `UiToggleEcsComponent` whose `group` references this
 * entity id is mutually exclusive with every other toggle referencing the
 * same group (see `createUiToggleEcsSystem`). The group entity itself is
 * purely logical - it needs no `RectTransformEcsComponent` and doesn't have
 * to be an ancestor of the toggles it groups.
 * @param world - The ECS world `entity` belongs to.
 * @param entity - The entity to attach the component to.
 * @param options - Options for configuring the group.
 * @returns The attached component, for further tuning or runtime changes.
 */
export function addUiToggleGroupComponent(
  world: EcsWorld,
  entity: number,
  options: Partial<UiToggleGroupDefaultedOptions> = {},
): UiToggleGroupEcsComponent {
  const component: UiToggleGroupEcsComponent = {
    ...defaultUiToggleGroupOptions,
    ...options,
  };

  return world.addComponent(entity, uiToggleGroupId, component);
}
