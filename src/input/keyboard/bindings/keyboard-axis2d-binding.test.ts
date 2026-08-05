import { describe, expect, it } from 'vitest';
import { KeyboardAxis2dBinding } from './keyboard-axis2d-binding';
import { Axis2dAction } from '../../actions';
import { keyCodes } from '../../constants';

describe('KeyboardAxis2dBinding', () => {
  const mockAction: Axis2dAction = new Axis2dAction(
    'testAxis2dAction',
    'default',
  );

  it('should create an instance with correct properties', () => {
    const binding = new KeyboardAxis2dBinding(
      mockAction,
      keyCodes.w,
      keyCodes.s,
      keyCodes.d,
      keyCodes.a,
    );

    expect(binding.action).toBe(mockAction);
    expect(binding.northKeyCode).toBe(keyCodes.w);
    expect(binding.southKeyCode).toBe(keyCodes.s);
    expect(binding.eastKeyCode).toBe(keyCodes.d);
    expect(binding.westKeyCode).toBe(keyCodes.a);
  });

  it('should set displayText based on the four key codes', () => {
    const binding = new KeyboardAxis2dBinding(
      mockAction,
      keyCodes.w,
      keyCodes.s,
      keyCodes.d,
      keyCodes.a,
    );

    expect(binding.displayText).toBe(
      `${keyCodes.w}, ${keyCodes.a}, ${keyCodes.s}, ${keyCodes.d} keys`,
    );
  });
});
