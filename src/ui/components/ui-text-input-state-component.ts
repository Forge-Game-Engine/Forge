import { createComponentId } from '../../ecs/ecs-component.js';
import type { TextEntry } from '../../input/text-entry/text-entry.js';

/**
 * The DOM listeners `createUiTextInputEcsSystem` attaches to the canvas's
 * container, kept so `cleanup` can remove them.
 */
export interface UiTextInputListeners {
  /** The element the listeners are attached to. */
  readonly container: HTMLElement;

  /** The `pointerdown` listener. */
  readonly onPointerDown: (event: PointerEvent) => void;

  /** The `mousedown` listener. */
  readonly onMouseDown: (event: MouseEvent) => void;

  /** The `pointerup` listener. */
  readonly onPointerUp: (event: PointerEvent) => void;
}

/**
 * The state the UI text input system keeps between runs, in a singleton
 * (see `EcsWorld.addSingleton`) the system adds when it's registered.
 *
 * System-owned: written only by `createUiTextInputEcsSystem` and its DOM
 * listeners.
 */
export interface UiTextInputStateEcsComponent {
  /**
   * The hidden input of every text field the system has seen, by field
   * entity, so a field's input is disposed when the field stops being one.
   */
  readonly entries: Map<number, TextEntry>;

  /**
   * The text field a primary-button press started on, until the press is
   * released.
   */
  pressedField: number | null;

  /** The DOM listeners, while they're attached. */
  listeners: UiTextInputListeners | null;
}

export const uiTextInputStateId =
  createComponentId<UiTextInputStateEcsComponent>('uiTextInputState');
