import { createComponentId } from '../../ecs/ecs-component.js';
import { EcsWorld } from '../../ecs/ecs-world.js';
import { ParameterizedForgeEvent } from '../../events/index.js';

/**
 * Fields of {@link UiDropdownEcsComponent} with no sensible default; callers
 * must always provide these.
 */
export interface UiDropdownRequiredOptions {
  /** The dropdown's option labels, in display order. Must be non-empty. */
  options: readonly string[];
}

/**
 * Fields of {@link UiDropdownEcsComponent} with a sensible default; callers
 * may omit these.
 */
export interface UiDropdownDefaultedOptions {
  /** The index into `options` initially selected. Defaults to `0`. */
  selectedIndex: number;
}

/**
 * A header + option-list selector's state. Unlike `UiToggleEcsComponent`/
 * `UiSliderEcsComponent`, there's no generic `createUiDropdownEcsSystem` -
 * opening/closing the option list touches several sibling entities'
 * `SpriteEcsComponent.enabled`/`TextEcsComponent.enabled`/
 * `UiInteractableEcsComponent.interactable` at once (so a closed list is
 * both invisible and un-raycastable), which only the assembly that created
 * those entities - `createDropdown` - knows how to reach. `isOpen` and
 * `selectedIndex` are written by `createDropdown`'s own listeners; treat
 * them as read-only unless you're replacing that wiring with your own.
 */
export interface UiDropdownEcsComponent
  extends UiDropdownRequiredOptions, UiDropdownDefaultedOptions {
  /** Whether the option list is currently expanded. */
  isOpen: boolean;

  /** Raised whenever an option is selected. Passes the newly selected index. */
  readonly onValueChanged: ParameterizedForgeEvent<number>;
}

export const uiDropdownId =
  createComponentId<UiDropdownEcsComponent>('uiDropdown');

/**
 * Attaches a {@link UiDropdownEcsComponent} to `entity`. Prefer
 * `createDropdown`, which builds the header/option-row entities this
 * component's `isOpen`/`selectedIndex` transitions are wired against - this
 * is exposed mainly for `createDropdown`'s own use and for tests.
 * @param world - The ECS world `entity` belongs to.
 * @param entity - The entity to attach the component to.
 * @param options - Options for configuring the dropdown. `options` has no
 * sensible default and must always be provided, and must be non-empty.
 * @returns The attached component.
 * @throws An error if `options.options` is empty, or if `selectedIndex` is
 * out of bounds for it.
 */
export function addUiDropdownComponent(
  world: EcsWorld,
  entity: number,
  options: UiDropdownRequiredOptions & Partial<UiDropdownDefaultedOptions>,
): UiDropdownEcsComponent {
  const { options: optionLabels, selectedIndex = 0 } = options;

  if (optionLabels.length === 0) {
    throw new Error('Unable to add a UiDropdownEcsComponent with no options.');
  }

  if (selectedIndex < 0 || selectedIndex >= optionLabels.length) {
    throw new Error(
      `Unable to add a UiDropdownEcsComponent, selectedIndex "${selectedIndex}" is out of bounds for ${optionLabels.length} options.`,
    );
  }

  const component: UiDropdownEcsComponent = {
    options: optionLabels,
    selectedIndex,
    isOpen: false,
    onValueChanged: new ParameterizedForgeEvent('uiDropdown.onValueChanged'),
  };

  return world.addComponent(entity, uiDropdownId, component);
}
