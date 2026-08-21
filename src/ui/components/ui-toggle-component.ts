import { createComponentId } from '../../ecs/ecs-component.js';
import { EcsWorld } from '../../ecs/ecs-world.js';
import { ParameterizedForgeEvent } from '../../events/index.js';

/**
 * Fields of {@link UiToggleEcsComponent} with a sensible default; callers
 * may omit these.
 */
export interface UiToggleDefaultedOptions {
  /** Whether this toggle is currently on. System-owned once `group` links it into a radio group's mutual exclusivity; freely settable otherwise. */
  isOn: boolean;

  /**
   * The entity id of a `UiToggleGroupEcsComponent` this toggle belongs to.
   * Toggles sharing a group are mutually exclusive - turning one on turns
   * every other toggle in the group off (see `createUiToggleEcsSystem`).
   * Omitted, this toggle behaves as an independent checkbox.
   */
  group?: number;
}

/**
 * A rect that holds a persistent on/off state, flipped by invocation - the
 * data half of a checkbox or radio button. Attach alongside a
 * `UiInteractableEcsComponent` (for `createUiToggleEcsSystem` to read
 * `wasInvokedThisFrame` from) and a `RectTransformEcsComponent`; use
 * `createToggle` for the common "box with a checkmark" visual assembly, or
 * build your own from these same pieces.
 */
export interface UiToggleEcsComponent extends UiToggleDefaultedOptions {
  /**
   * Raised whenever `isOn` changes - by a pointer click, a submit action, a
   * group-driven mutual-exclusion flip, or a direct `toggle.isOn =` write
   * followed by `createUiToggleEcsSystem`'s next tick reconciling group
   * state. Passes the new value.
   */
  readonly onValueChanged: ParameterizedForgeEvent<boolean>;
}

export const uiToggleId = createComponentId<UiToggleEcsComponent>('uiToggle');

const defaultUiToggleOptions: UiToggleDefaultedOptions = {
  isOn: false,
};

/**
 * Attaches a {@link UiToggleEcsComponent} to `entity`. Needs a
 * `UiInteractableEcsComponent` on the same entity for
 * `createUiToggleEcsSystem` to flip `isOn` on invocation.
 * @param world - The ECS world `entity` belongs to.
 * @param entity - The entity to attach the component to.
 * @param options - Options for configuring the toggle. `isOn` defaults to
 * `false`; `group` is omitted by default (an independent checkbox).
 * @returns The attached component, for further tuning, listening to
 * `onValueChanged`, or reading/setting `isOn` directly.
 */
export function addUiToggleComponent(
  world: EcsWorld,
  entity: number,
  options: Partial<UiToggleDefaultedOptions> = {},
): UiToggleEcsComponent {
  const component: UiToggleEcsComponent = {
    ...defaultUiToggleOptions,
    ...options,

    onValueChanged: new ParameterizedForgeEvent('uiToggle.onValueChanged'),
  };

  return world.addComponent(entity, uiToggleId, component);
}
