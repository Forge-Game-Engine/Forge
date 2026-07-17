import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GamepadInputSource } from './gamepad-input-source';
import { GamepadAxis1dBinding } from '../bindings';
import { gamepadAxes, gamepadButtons } from '../../constants';
import { Axis1dAction } from '../../actions';
import { InputManager } from '../../input-manager';

const createGamepad = (
  axes: number[],
  buttonValues: number[],
  index: number = 0,
): Gamepad =>
  ({
    index,
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

  // The source resolves its gamepad from `navigator.getGamepads()` at
  // construction time (to pick up a gamepad that was already connected
  // before this source existed), so the mock must return the desired
  // gamepads *before* the source is constructed.
  const createSource = (gamepads: Gamepad[] = []): GamepadInputSource => {
    getGamepadsSpy.mockReturnValue(gamepads);

    return new GamepadInputSource(inputManager);
  };

  beforeEach(() => {
    getGamepadsSpy = vi.fn().mockReturnValue([]);
    Object.defineProperty(navigator, 'getGamepads', {
      value: getGamepadsSpy,
      configurable: true,
    });

    inputManager = new InputManager();
    inputManager.setActiveGroup(group);

    moveAction = new Axis1dAction('move', group);
    inputManager.addAxis1dActions(moveAction);
  });

  afterEach(() => {
    source.stop();
  });

  it('registers itself as an updatable on the input manager', () => {
    source = createSource();

    const updateSpy = vi.spyOn(source, 'update');

    inputManager.update(16);

    expect(updateSpy).toHaveBeenCalled();
  });

  it('does nothing when no gamepad is connected', () => {
    source = createSource();

    source.axis1dBindings.add(
      new GamepadAxis1dBinding(moveAction, {
        axisIndex: gamepadAxes.leftStickX,
      }),
    );

    source.update();

    expect(moveAction.value).toBe(0);
  });

  it('reads an analog stick axis into the bound action', () => {
    source = createSource([createGamepad([0.8, 0, 0, 0], [])]);

    source.axis1dBindings.add(
      new GamepadAxis1dBinding(moveAction, {
        axisIndex: gamepadAxes.leftStickX,
      }),
    );

    source.update();

    expect(moveAction.value).toBeCloseTo(0.8);
  });

  it('zeroes stick values within the deadzone', () => {
    source = createSource([createGamepad([0.05, 0, 0, 0], [])]);

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

    source = createSource([createGamepad([], buttonValues)]);

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

    source = createSource([createGamepad([0.8, 0, 0, 0], buttonValues)]);

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

    expect(moveAction.value).toBeCloseTo(0.8);
  });

  it('combines a stick and a D-pad bound to the same action', () => {
    const buttonValues: number[] = [];

    buttonValues[gamepadButtons.dpadRight] = 1;
    buttonValues[gamepadButtons.dpadLeft] = 0;

    source = createSource([createGamepad([0.5, 0, 0, 0], buttonValues)]);

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
    source = createSource([createGamepad([0, 0, 0, 0], [])]);

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
    source = createSource([createGamepad([0.8, 0, 0, 0], [])]);

    source.axis1dBindings.add(
      new GamepadAxis1dBinding(moveAction, {
        axisIndex: gamepadAxes.leftStickX,
      }),
    );

    source.update();
    expect(moveAction.value).toBeCloseTo(0.8);

    // A brand new Gamepad object (not a mutation of the one captured at
    // construction time) simulates browsers, like Firefox, that hand back a
    // frozen snapshot from `getGamepads()` rather than updating it in
    // place. This must still be picked up on the very next poll rather than
    // being stuck on the value read at construction time.
    getGamepadsSpy.mockReturnValue([createGamepad([0, 0, 0, 0], [])]);
    source.update();

    expect(moveAction.value).toBe(0);
  });

  it('picks up a gamepad connected after construction via the gamepadconnected event', () => {
    source = createSource();

    source.axis1dBindings.add(
      new GamepadAxis1dBinding(moveAction, {
        axisIndex: gamepadAxes.leftStickX,
      }),
    );

    source.update();
    expect(moveAction.value).toBe(0);

    const gamepad = createGamepad([0.8, 0, 0, 0], []);

    getGamepadsSpy.mockReturnValue([gamepad]);
    window.dispatchEvent(Object.assign(new Event('gamepadconnected'), { gamepad }));

    source.update();

    expect(moveAction.value).toBeCloseTo(0.8);
  });

  it('stops dispatching once stopped', () => {
    source = createSource();

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
