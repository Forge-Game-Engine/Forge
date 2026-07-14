import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GamepadInputSource } from './gamepad-input-source';
import { GamepadAxis1dBinding } from '../bindings';
import { gamepadAxes, gamepadButtons } from '../../constants';
import { Axis1dAction } from '../../actions';
import { InputManager } from '../../input-manager';

const createGamepad = (axes: number[], buttonValues: number[]): Gamepad =>
  ({
    axes,
    buttons: buttonValues.map((value) => ({
      value,
      pressed: value > 0,
      touched: value > 0,
    })),
  }) as unknown as Gamepad;

describe('GamepadInputSource', () => {
  const group = 'default';

  let inputManager: InputManager;
  let source: GamepadInputSource;
  let moveAction: Axis1dAction;
  let getGamepadsSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    inputManager = new InputManager();
    inputManager.setActiveGroup(group);
    source = new GamepadInputSource(inputManager);

    moveAction = new Axis1dAction('move', group);
    inputManager.addAxis1dActions(moveAction);

    getGamepadsSpy = vi.fn().mockReturnValue([]);
    Object.defineProperty(navigator, 'getGamepads', {
      value: getGamepadsSpy,
      configurable: true,
    });
  });

  afterEach(() => {
    source.stop();
  });

  it('registers itself as an updatable on the input manager', () => {
    const updateSpy = vi.spyOn(source, 'update');

    inputManager.update(16);

    expect(updateSpy).toHaveBeenCalled();
  });

  it('does nothing when no gamepad is connected', () => {
    source.axis1dBindings.add(
      new GamepadAxis1dBinding(moveAction, {
        axisIndex: gamepadAxes.leftStickX,
      }),
    );

    source.update();

    expect(moveAction.value).toBe(0);
  });

  it('reads an analog stick axis into the bound action', () => {
    getGamepadsSpy.mockReturnValue([createGamepad([0.8, 0, 0, 0], [])]);

    source.axis1dBindings.add(
      new GamepadAxis1dBinding(moveAction, {
        axisIndex: gamepadAxes.leftStickX,
      }),
    );

    source.update();

    expect(moveAction.value).toBe(0.8);
  });

  it('zeroes stick values within the deadzone', () => {
    getGamepadsSpy.mockReturnValue([createGamepad([0.05, 0, 0, 0], [])]);

    source.axis1dBindings.add(
      new GamepadAxis1dBinding(moveAction, {
        axisIndex: gamepadAxes.leftStickX,
      }),
    );

    source.update();

    expect(moveAction.value).toBe(0);
  });

  it('reads a pair of digital buttons into the bound action', () => {
    const buttonValues: number[] = [];

    buttonValues[gamepadButtons.dpadRight] = 1;
    buttonValues[gamepadButtons.dpadLeft] = 0;

    getGamepadsSpy.mockReturnValue([createGamepad([], buttonValues)]);

    source.axis1dBindings.add(
      new GamepadAxis1dBinding(moveAction, {
        positiveButtonIndex: gamepadButtons.dpadRight,
        negativeButtonIndex: gamepadButtons.dpadLeft,
      }),
    );

    source.update();

    expect(moveAction.value).toBe(1);
  });

  it('does not let an idle binding overwrite an active binding on the same action', () => {
    const buttonValues: number[] = [];

    buttonValues[gamepadButtons.dpadRight] = 0;
    buttonValues[gamepadButtons.dpadLeft] = 0;

    getGamepadsSpy.mockReturnValue([
      createGamepad([0.8, 0, 0, 0], buttonValues),
    ]);

    source.axis1dBindings.add(
      new GamepadAxis1dBinding(moveAction, {
        axisIndex: gamepadAxes.leftStickX,
      }),
    );

    source.axis1dBindings.add(
      new GamepadAxis1dBinding(moveAction, {
        positiveButtonIndex: gamepadButtons.dpadRight,
        negativeButtonIndex: gamepadButtons.dpadLeft,
      }),
    );

    source.update();

    expect(moveAction.value).toBe(0.8);
  });

  it('combines a stick and a D-pad bound to the same action', () => {
    const buttonValues: number[] = [];

    buttonValues[gamepadButtons.dpadRight] = 1;
    buttonValues[gamepadButtons.dpadLeft] = 0;

    getGamepadsSpy.mockReturnValue([
      createGamepad([0.5, 0, 0, 0], buttonValues),
    ]);

    source.axis1dBindings.add(
      new GamepadAxis1dBinding(moveAction, {
        axisIndex: gamepadAxes.leftStickX,
      }),
    );

    source.axis1dBindings.add(
      new GamepadAxis1dBinding(moveAction, {
        positiveButtonIndex: gamepadButtons.dpadRight,
        negativeButtonIndex: gamepadButtons.dpadLeft,
      }),
    );

    source.update();

    expect(moveAction.value).toBe(1);
  });

  it('does not re-dispatch an unchanged idle value, leaving another source in control of the action', () => {
    getGamepadsSpy.mockReturnValue([createGamepad([0, 0, 0, 0], [])]);

    source.axis1dBindings.add(
      new GamepadAxis1dBinding(moveAction, {
        axisIndex: gamepadAxes.leftStickX,
      }),
    );

    source.update();
    expect(moveAction.value).toBe(0);

    // Simulate another source (e.g. KeyboardInputSource) dispatching on a
    // key event, independent of the gamepad's per-frame poll.
    moveAction.set(1);
    expect(moveAction.value).toBe(1);

    // The idle gamepad polls again with the exact same value as before, so
    // it must not re-dispatch and stomp the other source's value.
    source.update();

    expect(moveAction.value).toBe(1);
  });

  it('re-dispatches once the gamepad value actually changes, taking back control', () => {
    getGamepadsSpy.mockReturnValue([createGamepad([0.8, 0, 0, 0], [])]);

    source.axis1dBindings.add(
      new GamepadAxis1dBinding(moveAction, {
        axisIndex: gamepadAxes.leftStickX,
      }),
    );

    source.update();
    expect(moveAction.value).toBe(0.8);

    getGamepadsSpy.mockReturnValue([createGamepad([0, 0, 0, 0], [])]);
    source.update();

    expect(moveAction.value).toBe(0);
  });

  it('stops dispatching once stopped', () => {
    source.axis1dBindings.add(
      new GamepadAxis1dBinding(moveAction, {
        axisIndex: gamepadAxes.leftStickX,
      }),
    );

    source.stop();

    const updateSpy = vi.spyOn(source, 'update');

    inputManager.update(16);

    expect(updateSpy).not.toHaveBeenCalled();
  });
});
