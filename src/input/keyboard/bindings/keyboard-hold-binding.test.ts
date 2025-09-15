import { describe, expect, it } from 'vitest';
import { KeyboardHoldBinding } from './keyboard-hold-binding';
import { HoldAction } from '../../actions';
import { keyCodes } from '../../constants';

describe('KeyboardHoldBinding', () => {
  const mockAction: HoldAction = new HoldAction('testHoldAction');

  it('should create an instance with correct properties', () => {
    const binding = new KeyboardHoldBinding(mockAction, keyCodes.enter);

    expect(binding.action).toBe(mockAction);
    expect(binding.keyCode).toBe(keyCodes.enter);
    expect(binding.displayText).toBe('Enter key hold');
  });

  it('should set displayText based on keyCode', () => {
    const binding = new KeyboardHoldBinding(mockAction, 'Space');
    expect(binding.displayText).toBe('Space key hold');
  });
});
