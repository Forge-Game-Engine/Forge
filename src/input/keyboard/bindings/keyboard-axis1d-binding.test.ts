import { describe, expect, it } from 'vitest';
import { KeyboardAxis1dBinding } from './keyboard-axis1d-binding';
import { Axis1dAction } from '../../actions';
import { keyCodes } from '../../constants';

describe('KeyboardAxis1dBinding', () => {
  const mockAction: Axis1dAction = new Axis1dAction(
    'testAxis1dAction',
    'default',
  );

  it('should create an instance with correct properties', () => {
    const binding = new KeyboardAxis1dBinding(
      mockAction,
      keyCodes.arrowRight,
      keyCodes.arrowLeft,
    );

    expect(binding.action).toBe(mockAction);
    expect(binding.positiveKeyCode).toBe(keyCodes.arrowRight);
    expect(binding.negativeKeyCode).toBe(keyCodes.arrowLeft);
  });

  it('should set displayText based on the positive and negative key codes', () => {
    const binding = new KeyboardAxis1dBinding(
      mockAction,
      keyCodes.d,
      keyCodes.a,
    );

    expect(binding.displayText).toBe(`${keyCodes.a}, ${keyCodes.d} keys`);
  });
});
