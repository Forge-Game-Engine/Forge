import { describe, expect, it } from 'vitest';
import { KeyboardTriggerBinding } from './keyboard-trigger-binding';
import { TriggerAction } from 'forge/input/actions';
import { buttonMoments, keyCodes } from 'forge/input/constants';

describe('KeyboardTriggerBinding', () => {
  const mockAction = new TriggerAction('testTriggerAction', 'default');

  it('should create an instance with correct properties', () => {
    const binding = new KeyboardTriggerBinding(
      mockAction,
      keyCodes.space,
      buttonMoments.up,
    );

    expect(binding.action).toBe(mockAction);
    expect(binding.keyCode).toBe(keyCodes.space);
    expect(binding.moment).toBe(buttonMoments.up);
    expect(binding.displayText).toBe('Space key up');
  });

  it('should set displayText correctly for different key and moment', () => {
    const binding = new KeyboardTriggerBinding(
      mockAction,
      keyCodes.enter,
      buttonMoments.down,
    );

    expect(binding.displayText).toBe('Enter key down');
  });
});
