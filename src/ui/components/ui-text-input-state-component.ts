import { createComponentId } from '../../ecs/ecs-component.js';

/**
 * The state the UI text input system keeps between its DOM listeners'
 * events, in a singleton (see `EcsWorld.addSingleton`) the system adds when
 * it's registered. The fields' hidden inputs and the listeners themselves
 * are DOM resources, owned by the `TextEntryService` the system was given.
 *
 * System-owned: written only by `createUiTextInputEcsSystem` and its DOM
 * listeners.
 */
export interface UiTextInputStateEcsComponent {
  /**
   * The text field a primary-button press started on, until the press is
   * released.
   */
  pressedField: number | null;
}

export const uiTextInputStateId =
  createComponentId<UiTextInputStateEcsComponent>('uiTextInputState');
