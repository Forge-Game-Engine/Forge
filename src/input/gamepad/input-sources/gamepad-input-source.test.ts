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
    window.dispatchEvent(
      Object.assign(new Event('gamepadconnected'), { gamepad }),
    );

    source.update();

    expect(moveAction.value).toBeCloseTo(0.8);
  });

  it('reads a negative digital button on its own into the bound action', () => {
    const buttonValues: number[] = [];

    buttonValues[gamepadButtons.dpadRight] = 0;
    buttonValues[gamepadButtons.dpadLeft] = 1;

    source = createSource([createGamepad([], buttonValues)]);

    source.axis1dBindings.add(
      new GamepadAxis1dBinding(moveAction, {
        positiveButtonIndex: gamepadButtons.dpadRight,
        negativeButtonIndex: gamepadButtons.dpadLeft,
      }),
    );

    source.update();

    expect(moveAction.value).toBe(-1);
  });

  it('stops dispatching once the gamepad disconnects mid-session', () => {
    source = createSource([createGamepad([0.8, 0, 0, 0], [])]);

    source.axis1dBindings.add(
      new GamepadAxis1dBinding(moveAction, {
        axisIndex: gamepadAxes.leftStickX,
      }),
    );

    source.update();
    expect(moveAction.value).toBeCloseTo(0.8);

    // The gamepad reported by navigator.getGamepads() no longer includes
    // this gamepad's index (e.g. it was unplugged).
    getGamepadsSpy.mockReturnValue([]);
    moveAction.set(0.3);

    source.update();

    expect(moveAction.value).toBeCloseTo(0.3);
  });

  it('ignores a gamepadconnected event once a gamepad is already tracked', () => {
    const firstGamepad = createGamepad([0.8, 0, 0, 0], []);

    source = createSource([firstGamepad]);

    source.axis1dBindings.add(
      new GamepadAxis1dBinding(moveAction, {
        axisIndex: gamepadAxes.leftStickX,
      }),
    );

    const secondGamepad = createGamepad([0.2, 0, 0, 0], [], 1);

    getGamepadsSpy.mockReturnValue([firstGamepad, secondGamepad]);
    window.dispatchEvent(
      Object.assign(new Event('gamepadconnected'), { gamepad: secondGamepad }),
    );

    source.update();

    // Still reading from the first gamepad, since it was already tracked.
    expect(moveAction.value).toBeCloseTo(0.8);
  });

  it('ignores a gamepadconnected event for a different index than requested', () => {
    source = createSource();

    source.axis1dBindings.add(
      new GamepadAxis1dBinding(moveAction, {
        axisIndex: gamepadAxes.leftStickX,
      }),
    );

    const otherGamepad = createGamepad([0.8, 0, 0, 0], [], 1);

    getGamepadsSpy.mockReturnValue([undefined, otherGamepad]);
    window.dispatchEvent(
      Object.assign(new Event('gamepadconnected'), { gamepad: otherGamepad }),
    );

    source.update();

    expect(moveAction.value).toBe(0);
  });

  it('tracks whichever gamepad connects when constructed with index -1', () => {
    source = new GamepadInputSource(inputManager, -1);

    source.axis1dBindings.add(
      new GamepadAxis1dBinding(moveAction, {
        axisIndex: gamepadAxes.leftStickX,
      }),
    );

    const gamepad = createGamepad([0.8, 0, 0, 0], []);

    getGamepadsSpy.mockReturnValue([gamepad]);
    window.dispatchEvent(
      Object.assign(new Event('gamepadconnected'), { gamepad }),
    );

    source.update();

    expect(moveAction.value).toBeCloseTo(0.8);
  });

  it('skips disconnected slots while searching backwards for the last-connected gamepad', () => {
    const gamepads: Gamepad[] = [];

    gamepads[0] = createGamepad([0.6, 0, 0, 0], [], 0);
    gamepads.length = 2; // gamepads[1] is a hole, simulating a disconnected slot.

    getGamepadsSpy.mockReturnValue(gamepads);

    source = new GamepadInputSource(inputManager, -1);

    source.axis1dBindings.add(
      new GamepadAxis1dBinding(moveAction, {
        axisIndex: gamepadAxes.leftStickX,
      }),
    );

    source.update();

    expect(moveAction.value).toBeCloseTo(0.6);
  });

  it('treats a missing axis value as 0', () => {
    // An empty axes array simulates a gamepad that doesn't report an axis
    // at the requested index.
    source = createSource([createGamepad([], [])]);

    source.axis1dBindings.add(
      new GamepadAxis1dBinding(moveAction, {
        axisIndex: gamepadAxes.leftStickX,
      }),
    );

    expect(() => source.update()).not.toThrow();
    expect(moveAction.value).toBe(0);
  });

  it('treats missing digital button values as 0', () => {
    // An empty buttons array simulates a gamepad that doesn't report
    // buttons at the requested indices.
    source = createSource([createGamepad([], [])]);

    source.axis1dBindings.add(
      new GamepadAxis1dBinding(moveAction, {
        positiveButtonIndex: gamepadButtons.dpadRight,
        negativeButtonIndex: gamepadButtons.dpadLeft,
      }),
    );

    expect(() => source.update()).not.toThrow();
    expect(moveAction.value).toBe(0);
  });

  it('resolves the last-connected gamepad when constructed with index -1', () => {
    const gamepads: Gamepad[] = [];

    gamepads[2] = createGamepad([0.6, 0, 0, 0], [], 2);

    getGamepadsSpy.mockReturnValue(gamepads);

    source = new GamepadInputSource(inputManager, -1);

    source.axis1dBindings.add(
      new GamepadAxis1dBinding(moveAction, {
        axisIndex: gamepadAxes.leftStickX,
      }),
    );

    source.update();

    expect(moveAction.value).toBeCloseTo(0.6);
  });

  it('resolves no gamepad when constructed with index -1 and none are connected', () => {
    getGamepadsSpy.mockReturnValue([]);

    source = new GamepadInputSource(inputManager, -1);

    expect(() => source.update()).not.toThrow();
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
