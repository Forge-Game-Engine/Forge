import { createComponentId } from '../../ecs/ecs-component.js';
import { ParameterizedForgeEvent } from '../../events/index.js';
import { UiInteractionEvent } from '../types/index.js';

/**
 * Per-element interaction state and event hooks.
 *
 * State flags are written by {@link createUiStateEcsSystem} and
 * {@link createUiKeyboardNavEcsSystem}. Listeners on the events receive a
 * {@link UiInteractionEvent} payload describing the entity, pointer position,
 * and whether the interaction came from a pointer or the keyboard.
 *
 * **Disabled short-circuit:** when `disabled` is `true` none of the other
 * flags change and no events are raised. Set `disabled` before adding the
 * entity to the world, or transition it at runtime — the system will emit
 * `onDisabledChange` when the flag flips.
 *
 * Use {@link createUiState} to construct a component with all events
 * pre-initialised.
 */
export interface UiStateEcsComponent {
  /** `true` while the pointer is over this element's hit area. */
  hovered: boolean;

  /** `true` while the primary pointer button is held and this element received the press-start. */
  pressed: boolean;

  /** `true` when this element holds keyboard focus. */
  focused: boolean;

  /**
   * When `true` the element does not participate in hover/press/focus.
   * Toggling this field at runtime causes `onDisabledChange` to fire.
   */
  disabled: boolean;

  /** Raised when the pointer enters the element's hit area. */
  onHoverEnter: ParameterizedForgeEvent<UiInteractionEvent>;

  /** Raised when the pointer leaves the element's hit area. */
  onHoverExit: ParameterizedForgeEvent<UiInteractionEvent>;

  /** Raised when the primary button is pressed while this element is hovered. */
  onPressStart: ParameterizedForgeEvent<UiInteractionEvent>;

  /** Raised when the primary button is released after a press on this element. */
  onPressEnd: ParameterizedForgeEvent<UiInteractionEvent>;

  /**
   * Raised when the primary button is released over the same element that
   * received the press-start (i.e. a completed click/tap).
   */
  onClick: ParameterizedForgeEvent<UiInteractionEvent>;

  /** Raised when this element gains keyboard focus. */
  onFocus: ParameterizedForgeEvent<UiInteractionEvent>;

  /** Raised when this element loses keyboard focus. */
  onBlur: ParameterizedForgeEvent<UiInteractionEvent>;

  /** Raised when the `disabled` flag changes. */
  onDisabledChange: ParameterizedForgeEvent<UiInteractionEvent>;
}

/** Component id for {@link UiStateEcsComponent}. */
export const uiStateId = createComponentId<UiStateEcsComponent>('ui-state');

/**
 * Creates a {@link UiStateEcsComponent} with all events pre-initialised and
 * all state flags set to their default values.
 * @returns A ready-to-use component value.
 */
export function createUiState(): UiStateEcsComponent {
  return {
    hovered: false,
    pressed: false,
    focused: false,
    disabled: false,
    onHoverEnter: new ParameterizedForgeEvent('ui.hoverEnter'),
    onHoverExit: new ParameterizedForgeEvent('ui.hoverExit'),
    onPressStart: new ParameterizedForgeEvent('ui.pressStart'),
    onPressEnd: new ParameterizedForgeEvent('ui.pressEnd'),
    onClick: new ParameterizedForgeEvent('ui.click'),
    onFocus: new ParameterizedForgeEvent('ui.focus'),
    onBlur: new ParameterizedForgeEvent('ui.blur'),
    onDisabledChange: new ParameterizedForgeEvent('ui.disabledChange'),
  };
}
