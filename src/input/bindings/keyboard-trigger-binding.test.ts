import { describe, expect, it } from 'vitest';
import { KeyboardTriggerBinding } from './keyboard-trigger-binding';
import { buttonMoments, keyCodes } from '../constants';
import { KeyboardInputSource } from '../input-sources';
import { InputManager } from '../input-manager';

describe('KeyboardTriggerBinding', () => {
  const manager = new InputManager();
  const source = new KeyboardInputSource(manager);
  const args = { moment: buttonMoments.down, keyCode: keyCodes.space };

  it('matchesArgs returns true for matching args', () => {
    const binding = new KeyboardTriggerBinding(args, source);

    expect(
      binding.matchesArgs({
        moment: buttonMoments.down,
        keyCode: keyCodes.space,
      }),
    ).toBe(true);
  });

  it('matchesArgs returns false for non-matching moment', () => {
    const binding = new KeyboardTriggerBinding(args, source);

    expect(
      binding.matchesArgs({
        moment: buttonMoments.up,
        keyCode: keyCodes.space,
      }),
    ).toBe(false);
  });

  it('matchesArgs returns false for non-matching keyCode', () => {
    const binding = new KeyboardTriggerBinding(args, source);
    expect(
      binding.matchesArgs({
        moment: buttonMoments.down,
        keyCode: keyCodes.enter,
      }),
    ).toBe(false);
  });

  it('displayText returns correct string', () => {
    const binding = new KeyboardTriggerBinding(args, source);
    expect(binding.displayText).toBe('On "Space" down');
  });
});
