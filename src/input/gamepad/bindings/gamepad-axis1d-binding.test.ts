import { describe, expect, it } from 'vitest';
import { GamepadAxis1dBinding } from './gamepad-axis1d-binding';
import { Axis1dAction } from '../../actions';
import { gamepadAxes, gamepadButtons } from '../../constants';

describe('GamepadAxis1dBinding', () => {
  it('stores an axis-based source and describes it', () => {
    const action = new Axis1dAction('move');
    const binding = new GamepadAxis1dBinding(action, {
      axisIndex: gamepadAxes.leftStickX,
    });

    expect(binding.action).toBe(action);
    expect(binding.source).toEqual({ axisIndex: gamepadAxes.leftStickX });
    expect(binding.displayText).toBe('gamepad axis 0');
  });

  it('stores a button-based source and describes it', () => {
    const action = new Axis1dAction('move');
    const binding = new GamepadAxis1dBinding(action, {
      positiveButtonIndex: gamepadButtons.dpadRight,
      negativeButtonIndex: gamepadButtons.dpadLeft,
    });

    expect(binding.action).toBe(action);
    expect(binding.source).toEqual({
      positiveButtonIndex: gamepadButtons.dpadRight,
      negativeButtonIndex: gamepadButtons.dpadLeft,
    });
    expect(binding.displayText).toBe('gamepad buttons 14/15');
  });
});
