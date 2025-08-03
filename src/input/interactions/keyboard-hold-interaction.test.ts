import { describe, expect, it } from 'vitest';
import { KeyboardHoldInteraction } from './keyboard-hold-interaction';
import { keyCodes } from '../constants';
import { KeyboardInputSource } from '../input-sources';
import { InputManager } from '../input-manager';

describe('KeyboardHoldInteraction', () => {
  const manager = new InputManager();
  const source = new KeyboardInputSource(manager);
  const args = { keyCode: keyCodes.space };

  it('matchesArgs returns true for matching args', () => {
    const interaction = new KeyboardHoldInteraction(args, source);

    expect(
      interaction.matchesArgs({
        keyCode: keyCodes.space,
      }),
    ).toBe(true);
  });

  it('matchesArgs returns false for non-matching keyCode', () => {
    const interaction = new KeyboardHoldInteraction(args, source);
    expect(
      interaction.matchesArgs({
        keyCode: keyCodes.enter,
      }),
    ).toBe(false);
  });

  it('displayText returns correct string', () => {
    const interaction = new KeyboardHoldInteraction(args, source);
    expect(interaction.displayText).toBe('On "Space" hold');
  });
});
