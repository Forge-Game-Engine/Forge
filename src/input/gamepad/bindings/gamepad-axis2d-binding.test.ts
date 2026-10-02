import { describe, expect, it } from 'vitest';
import { GamepadAxis2dBinding } from './gamepad-axis2d-binding';
import { Axis2dAction } from '../../actions';
import { gamepadAxes, gamepadButtons } from '../../constants';

describe('GamepadAxis2dBinding', () => {
  it('stores a stick-based source with default inversion and describes it', () => {
    const action = new Axis2dAction('move');
    const binding = new GamepadAxis2dBinding(action, {
      xAxisIndex: gamepadAxes.leftStickX,
      yAxisIndex: gamepadAxes.leftStickY,
    });

    expect(binding.action).toBe(action);
    expect(binding.source).toEqual({
      xAxisIndex: gamepadAxes.leftStickX,
      yAxisIndex: gamepadAxes.leftStickY,
      invertX: false,
      invertY: false,
    });
    expect(binding.displayText).toBe('gamepad axes 0/1');
  });

  it('describes an inverted stick axis', () => {
    const binding = new GamepadAxis2dBinding(new Axis2dAction('look'), {
      xAxisIndex: gamepadAxes.rightStickX,
      yAxisIndex: gamepadAxes.rightStickY,
      invertY: true,
    });

    expect(binding.displayText).toBe('gamepad axes 2/3 (inverted)');
  });

  it('stores a button-based source and describes it', () => {
    const action = new Axis2dAction('move');
    const source = {
      northButtonIndex: gamepadButtons.dpadUp,
      southButtonIndex: gamepadButtons.dpadDown,
      eastButtonIndex: gamepadButtons.dpadRight,
      westButtonIndex: gamepadButtons.dpadLeft,
    };
    const binding = new GamepadAxis2dBinding(action, source);

    expect(binding.action).toBe(action);
    expect(binding.source).toEqual(source);
    expect(binding.displayText).toBe('gamepad buttons 12/14/13/15');
  });
});
