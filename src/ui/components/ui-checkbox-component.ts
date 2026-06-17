import { createComponentId } from '../../ecs/ecs-component.js';
import { ParameterizedForgeEvent } from '../../events/index.js';

/**
 * Payload for {@link UiCheckboxEcsComponent} change events.
 */
export interface UiCheckboxChangeEvent {
  /** The checkbox entity. */
  entity: number;
  /** The new checked state after the toggle. */
  checked: boolean;
}

/**
 * Stores the checked state and change event for a checkbox widget.
 *
 * Attach to the root entity created by {@link createUiCheckbox}. The checked
 * state is toggled by `onClick` (pointer click or `ui.activate` keyboard
 * action); `onChange` fires each time the value changes.
 */
export interface UiCheckboxEcsComponent {
  /** Current checked state. */
  checked: boolean;

  /** Raised whenever `checked` changes. */
  onChange: ParameterizedForgeEvent<UiCheckboxChangeEvent>;
}

/** Component id for {@link UiCheckboxEcsComponent}. */
export const uiCheckboxId =
  createComponentId<UiCheckboxEcsComponent>('ui-checkbox');

/**
 * Creates a {@link UiCheckboxEcsComponent} with the given initial state and a
 * pre-initialised `onChange` event.
 *
 * @param checked - Initial checked state. Defaults to `false`.
 * @returns A ready-to-use component value.
 */
export function createUiCheckboxState(checked = false): UiCheckboxEcsComponent {
  return {
    checked,
    onChange: new ParameterizedForgeEvent('ui.checkboxChange'),
  };
}
