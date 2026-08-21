/**
 * The visual state `createUiTransitionEcsSystem` derives from a
 * `UiInteractableEcsComponent`'s interaction state, merging `isHovered` and
 * `isFocused` into one value so an element looks highlighted whether it's
 * moused-over or gamepad-focused, with no transition component having to
 * know which input the player is using.
 */
export const uiInteractionVisualStates = {
  normal: 'normal',
  hover: 'hover',
  pressed: 'pressed',
  disabled: 'disabled',
} as const;

/** A value of {@link uiInteractionVisualStates}. */
export type UiInteractionVisualState =
  (typeof uiInteractionVisualStates)[keyof typeof uiInteractionVisualStates];

/**
 * Derives the merged visual state a `UiInteractableEcsComponent` is
 * currently in: `disabled` when not interactable, `pressed` while a press
 * is captured, `hover` while hovered or focused (pointer and gamepad read
 * as the same highlighted state), `normal` otherwise.
 * @param interactable - The interactable's `interactable`/`isPressed`/
 * `isHovered`/`isFocused` state.
 * @returns The derived visual state.
 */
export function deriveUiInteractionVisualState(interactable: {
  interactable: boolean;
  isPressed: boolean;
  isHovered: boolean;
  isFocused: boolean;
}): UiInteractionVisualState {
  if (!interactable.interactable) {
    return uiInteractionVisualStates.disabled;
  }

  if (interactable.isPressed) {
    return uiInteractionVisualStates.pressed;
  }

  if (interactable.isHovered || interactable.isFocused) {
    return uiInteractionVisualStates.hover;
  }

  return uiInteractionVisualStates.normal;
}
