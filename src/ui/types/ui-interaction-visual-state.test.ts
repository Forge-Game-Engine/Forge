import { describe, expect, it } from 'vitest';
import {
  deriveUiInteractionVisualState,
  uiInteractionVisualStates,
} from './ui-interaction-visual-state.js';

describe('deriveUiInteractionVisualState', () => {
  it('returns disabled when not interactable, regardless of other flags', () => {
    expect(
      deriveUiInteractionVisualState({
        interactable: false,
        isPressed: true,
        isHovered: true,
        isFocused: true,
      }),
    ).toBe(uiInteractionVisualStates.disabled);
  });

  it('returns pressed when a press is captured', () => {
    expect(
      deriveUiInteractionVisualState({
        interactable: true,
        isPressed: true,
        isHovered: false,
        isFocused: false,
      }),
    ).toBe(uiInteractionVisualStates.pressed);
  });

  it('returns hover when hovered', () => {
    expect(
      deriveUiInteractionVisualState({
        interactable: true,
        isPressed: false,
        isHovered: true,
        isFocused: false,
      }),
    ).toBe(uiInteractionVisualStates.hover);
  });

  it('returns hover when focused via gamepad, with no pointer hover', () => {
    expect(
      deriveUiInteractionVisualState({
        interactable: true,
        isPressed: false,
        isHovered: false,
        isFocused: true,
      }),
    ).toBe(uiInteractionVisualStates.hover);
  });

  it('returns normal otherwise', () => {
    expect(
      deriveUiInteractionVisualState({
        interactable: true,
        isPressed: false,
        isHovered: false,
        isFocused: false,
      }),
    ).toBe(uiInteractionVisualStates.normal);
  });
});
