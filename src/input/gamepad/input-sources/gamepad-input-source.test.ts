import { afterEach, beforeEach, describe, expect, it, Mock, vi } from 'vitest';
import { GamepadInputSource } from './gamepad-input-source';
import {
  GamepadAxis1dBinding,
  GamepadAxis2dBinding,
  GamepadHoldBinding,
  GamepadTriggerBinding,
} from '../bindings';
import { buttonMoments, gamepadAxes, gamepadButtons } from '../../constants';
import {
  Axis1dAction,
  Axis2dAction,
  HoldAction,
  TriggerAction,
} from '../../actions';
import { InputManager } from '../../input-manager';
import { InputSource } from '../../input-source';

/** Another source (e.g. the keyboard) bound to the same actions. */
const otherSource: InputSource = { name: 'other' };

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

/** Builds a `buttons` value array with each of `buttonIndices` fully pressed. */
const pressButtons = (...buttonIndices: number[]): number[] => {
  const buttonValues = new Array<number>(17).fill(0);

  for (const buttonIndex of buttonIndices) {
    buttonValues[buttonIndex] = 1;
  }

  return buttonValues;
};

const dispatchGamepadEvent = (
  type: 'gamepadconnected' | 'gamepaddisconnected',
  gamepad: Gamepad,
): void => {
  window.dispatchEvent(Object.assign(new Event(type), { gamepad }));
};

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

  it('does not let an idle gamepad override another source on the same action', () => {
    source = createSource([createGamepad([0, 0, 0, 0], [])]);

    source.axis1dBindings.add(
      new GamepadAxis1dBinding(moveAction, {
        axisIndex: gamepadAxes.leftStickX,
      }),
    );

    source.update();
    expect(moveAction.value).toBe(0);

    inputManager.setAxis1dInput(otherSource, moveAction, 1);
    expect(moveAction.value).toBe(1);

    // The idle gamepad reports `0` again, which is weaker than the other
    // source's input, so it doesn't take the action over.
    source.update();

    expect(moveAction.value).toBe(1);
  });

  it('reads a fresh gamepad snapshot every poll', () => {
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

  it('releases an axis it was driving once the gamepad disappears from navigator.getGamepads()', () => {
    const stickAction = new Axis1dAction('stickMove', group);

    inputManager.addAxis1dActions(stickAction);

    source = createSource([createGamepad([0.8, 0, 0, 0], [])]);

    source.axis1dBindings.add(
      new GamepadAxis1dBinding(stickAction, {
        axisIndex: gamepadAxes.leftStickX,
      }),
    );

    source.update();
    expect(stickAction.value).toBeCloseTo(0.8);

    // The gamepad reported by navigator.getGamepads() no longer includes
    // this gamepad's index (e.g. it was unplugged).
    getGamepadsSpy.mockReturnValue([]);

    source.update();

    expect(stickAction.value).toBe(0);
  });

  it('does not override another source once the gamepad has disappeared and been released', () => {
    source = createSource([createGamepad([0.8, 0, 0, 0], [])]);

    source.axis1dBindings.add(
      new GamepadAxis1dBinding(moveAction, {
        axisIndex: gamepadAxes.leftStickX,
      }),
    );

    source.update();
    getGamepadsSpy.mockReturnValue([]);
    source.update();
    expect(moveAction.value).toBe(0);

    // Another source takes over the action after the gamepad is gone.
    inputManager.setAxis1dInput(otherSource, moveAction, 0.3);

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
  describe('stick Y axes', () => {
    it('reports a stick pushed up as positive', () => {
      source = createSource([createGamepad([0, -0.8, 0, 0], [])]);

      source.axis1dBindings.add(
        new GamepadAxis1dBinding(moveAction, {
          axisIndex: gamepadAxes.leftStickY,
        }),
      );

      source.update();

      expect(moveAction.value).toBeCloseTo(0.8);
    });

    it('reports the right stick pushed up as positive and leaves X axes as reported', () => {
      const lookAction = new Axis1dAction('look', group);

      inputManager.addAxis1dActions(lookAction);
      source = createSource([createGamepad([0, 0, 0.4, -0.7], [])]);

      source.axis1dBindings.add(
        new GamepadAxis1dBinding(moveAction, {
          axisIndex: gamepadAxes.rightStickX,
        }),
      );
      source.axis1dBindings.add(
        new GamepadAxis1dBinding(lookAction, {
          axisIndex: gamepadAxes.rightStickY,
        }),
      );

      source.update();

      expect(moveAction.value).toBeCloseTo(0.4);
      expect(lookAction.value).toBeCloseTo(0.7);
    });

    it('reads 0, not -0, within the deadzone', () => {
      source = createSource([createGamepad([0, 0.05, 0, 0], [])]);

      source.axis1dBindings.add(
        new GamepadAxis1dBinding(moveAction, {
          axisIndex: gamepadAxes.leftStickY,
        }),
      );

      source.update();

      expect(Object.is(moveAction.value, 0)).toBe(true);
    });

    it('agrees with a D-pad bound to the same up-is-positive action', () => {
      source = createSource([
        createGamepad([0, -0.5, 0, 0], pressButtons(gamepadButtons.dpadUp)),
      ]);

      source.axis1dBindings.add(
        new GamepadAxis1dBinding(moveAction, {
          axisIndex: gamepadAxes.leftStickY,
        }),
      );
      source.axis1dBindings.add(
        new GamepadAxis1dBinding(moveAction, {
          positiveButtonIndex: gamepadButtons.dpadUp,
          negativeButtonIndex: gamepadButtons.dpadDown,
        }),
      );

      source.update();

      // 0.5 from the stick plus 1 from the D-pad, clamped.
      expect(moveAction.value).toBe(1);
    });
  });

  describe('axis-2d bindings', () => {
    let lookAction: Axis2dAction;

    beforeEach(() => {
      lookAction = new Axis2dAction('look', group);
      inputManager.addAxis2dActions(lookAction);
    });

    it('reads a stick into the bound action, with up positive', () => {
      source = createSource([createGamepad([0.5, -0.6, 0, 0], [])]);

      source.axis2dBindings.add(
        new GamepadAxis2dBinding(lookAction, {
          xAxisIndex: gamepadAxes.leftStickX,
          yAxisIndex: gamepadAxes.leftStickY,
        }),
      );

      source.update();

      expect(lookAction.value.x).toBeCloseTo(0.5);
      expect(lookAction.value.y).toBeCloseTo(0.6);
    });

    it('applies the deadzone to the overall stick deflection', () => {
      // Each axis alone is within the deadzone, but together they aren't.
      source = createSource([createGamepad([0.12, 0.12, 0, 0], [])]);

      source.axis2dBindings.add(
        new GamepadAxis2dBinding(lookAction, {
          xAxisIndex: gamepadAxes.leftStickX,
          yAxisIndex: gamepadAxes.leftStickY,
        }),
      );

      source.update();

      expect(lookAction.value.x).toBeCloseTo(0.12);
      expect(lookAction.value.y).toBeCloseTo(-0.12);

      getGamepadsSpy.mockReturnValue([createGamepad([0.05, 0.05, 0, 0], [])]);
      source.update();

      expect(lookAction.value.x).toBe(0);
      expect(lookAction.value.y).toBe(0);
    });

    it('reads four digital buttons into the bound action, with north positive', () => {
      source = createSource([
        createGamepad(
          [],
          pressButtons(gamepadButtons.dpadUp, gamepadButtons.dpadLeft),
        ),
      ]);

      source.axis2dBindings.add(
        new GamepadAxis2dBinding(lookAction, {
          northButtonIndex: gamepadButtons.dpadUp,
          southButtonIndex: gamepadButtons.dpadDown,
          eastButtonIndex: gamepadButtons.dpadRight,
          westButtonIndex: gamepadButtons.dpadLeft,
        }),
      );

      source.update();

      expect(lookAction.value.x).toBe(-1);
      expect(lookAction.value.y).toBe(1);
    });

    it('combines and clamps a stick and a D-pad bound to the same action', () => {
      source = createSource([
        createGamepad([0.5, 0, 0, 0], pressButtons(gamepadButtons.dpadRight)),
      ]);

      source.axis2dBindings.add(
        new GamepadAxis2dBinding(lookAction, {
          xAxisIndex: gamepadAxes.leftStickX,
          yAxisIndex: gamepadAxes.leftStickY,
        }),
      );
      source.axis2dBindings.add(
        new GamepadAxis2dBinding(lookAction, {
          northButtonIndex: gamepadButtons.dpadUp,
          southButtonIndex: gamepadButtons.dpadDown,
          eastButtonIndex: gamepadButtons.dpadRight,
          westButtonIndex: gamepadButtons.dpadLeft,
        }),
      );

      source.update();

      expect(lookAction.value.x).toBe(1);
      expect(lookAction.value.y).toBe(0);
    });

    it('does not let an idle gamepad override another source on the same action', () => {
      source = createSource([createGamepad([0, 0, 0, 0], [])]);

      source.axis2dBindings.add(
        new GamepadAxis2dBinding(lookAction, {
          xAxisIndex: gamepadAxes.leftStickX,
          yAxisIndex: gamepadAxes.leftStickY,
        }),
      );

      source.update();
      inputManager.setAxis2dInput(otherSource, lookAction, 1, 1);
      source.update();

      expect(lookAction.value.x).toBe(1);
      expect(lookAction.value.y).toBe(1);
    });

    it('releases the action once the gamepad disappears', () => {
      source = createSource([createGamepad([0.5, 0.5, 0, 0], [])]);

      source.axis2dBindings.add(
        new GamepadAxis2dBinding(lookAction, {
          xAxisIndex: gamepadAxes.leftStickX,
          yAxisIndex: gamepadAxes.leftStickY,
        }),
      );

      source.update();
      getGamepadsSpy.mockReturnValue([]);
      source.update();

      expect(lookAction.value.x).toBe(0);
      expect(lookAction.value.y).toBe(0);
    });
  });

  describe('hold bindings', () => {
    let shootAction: HoldAction;

    beforeEach(() => {
      shootAction = new HoldAction('shoot', group);
      inputManager.addHoldActions(shootAction);
    });

    it('starts a hold when the button is pressed and ends it when released', () => {
      const holdStart = vi.fn();
      const holdEnd = vi.fn();

      shootAction.holdStartEvent.registerListener(holdStart);
      shootAction.holdEndEvent.registerListener(holdEnd);

      source = createSource([createGamepad([], pressButtons())]);
      source.holdBindings.add(
        new GamepadHoldBinding(shootAction, gamepadButtons.faceButtonBottom),
      );

      source.update();
      expect(shootAction.isHeld).toBe(false);

      getGamepadsSpy.mockReturnValue([
        createGamepad([], pressButtons(gamepadButtons.faceButtonBottom)),
      ]);
      source.update();
      source.update();

      expect(shootAction.isHeld).toBe(true);
      expect(holdStart).toHaveBeenCalledTimes(1);

      getGamepadsSpy.mockReturnValue([createGamepad([], pressButtons())]);
      source.update();
      source.update();

      expect(shootAction.isHeld).toBe(false);
      expect(holdEnd).toHaveBeenCalledTimes(1);
    });

    it('keeps the hold while any button bound to the action is pressed', () => {
      source = createSource([
        createGamepad(
          [],
          pressButtons(
            gamepadButtons.faceButtonBottom,
            gamepadButtons.rightTrigger,
          ),
        ),
      ]);
      source.holdBindings.add(
        new GamepadHoldBinding(shootAction, gamepadButtons.faceButtonBottom),
      );
      source.holdBindings.add(
        new GamepadHoldBinding(shootAction, gamepadButtons.rightTrigger),
      );

      source.update();
      expect(shootAction.isHeld).toBe(true);

      getGamepadsSpy.mockReturnValue([
        createGamepad([], pressButtons(gamepadButtons.rightTrigger)),
      ]);
      source.update();
      expect(shootAction.isHeld).toBe(true);

      getGamepadsSpy.mockReturnValue([createGamepad([], pressButtons())]);
      source.update();
      expect(shootAction.isHeld).toBe(false);
    });

    it('does not end a hold that another source started', () => {
      source = createSource([createGamepad([], pressButtons())]);
      source.holdBindings.add(
        new GamepadHoldBinding(shootAction, gamepadButtons.faceButtonBottom),
      );

      inputManager.setHoldInput(otherSource, shootAction, true);
      source.update();

      expect(shootAction.isHeld).toBe(true);
    });

    it('ends the hold once the gamepad disappears', () => {
      source = createSource([
        createGamepad([], pressButtons(gamepadButtons.faceButtonBottom)),
      ]);
      source.holdBindings.add(
        new GamepadHoldBinding(shootAction, gamepadButtons.faceButtonBottom),
      );

      source.update();
      expect(shootAction.isHeld).toBe(true);

      getGamepadsSpy.mockReturnValue([]);
      source.update();

      expect(shootAction.isHeld).toBe(false);
    });
  });

  describe('trigger bindings', () => {
    let pressAction: TriggerAction;
    let releaseAction: TriggerAction;
    let pressListener: Mock<() => void>;
    let releaseListener: Mock<() => void>;

    const setPressedButtons = (...buttonIndices: number[]): void => {
      getGamepadsSpy.mockReturnValue([
        createGamepad([], pressButtons(...buttonIndices)),
      ]);
    };

    beforeEach(() => {
      pressAction = new TriggerAction('press', group);
      releaseAction = new TriggerAction('release', group);
      inputManager.addTriggerActions(pressAction, releaseAction);

      pressListener = vi.fn();
      releaseListener = vi.fn();
      pressAction.triggerEvent.registerListener(pressListener);
      releaseAction.triggerEvent.registerListener(releaseListener);

      source = createSource([createGamepad([], pressButtons())]);
      source.triggerBindings.add(
        new GamepadTriggerBinding(
          pressAction,
          gamepadButtons.start,
          buttonMoments.down,
        ),
      );
      source.triggerBindings.add(
        new GamepadTriggerBinding(
          releaseAction,
          gamepadButtons.start,
          buttonMoments.up,
        ),
      );
    });

    it('triggers a down binding once per press, not every frame the button is held', () => {
      source.update();
      expect(pressListener).not.toHaveBeenCalled();

      setPressedButtons(gamepadButtons.start);
      source.update();

      expect(pressAction.isTriggered).toBe(true);
      expect(pressListener).toHaveBeenCalledTimes(1);

      inputManager.reset();
      source.update();
      source.update();

      expect(pressAction.isTriggered).toBe(false);
      expect(pressListener).toHaveBeenCalledTimes(1);
      expect(releaseListener).not.toHaveBeenCalled();
    });

    it('triggers an up binding when the button is released', () => {
      setPressedButtons(gamepadButtons.start);
      source.update();

      setPressedButtons();
      source.update();

      expect(releaseAction.isTriggered).toBe(true);
      expect(releaseListener).toHaveBeenCalledTimes(1);
      expect(pressListener).toHaveBeenCalledTimes(1);
    });

    it('triggers a down binding again on a second press', () => {
      setPressedButtons(gamepadButtons.start);
      source.update();
      setPressedButtons();
      source.update();
      setPressedButtons(gamepadButtons.start);
      source.update();

      expect(pressListener).toHaveBeenCalledTimes(2);
    });

    it('does not trigger an up binding when the gamepad disappears mid-press', () => {
      setPressedButtons(gamepadButtons.start);
      source.update();

      getGamepadsSpy.mockReturnValue([]);
      source.update();

      expect(releaseListener).not.toHaveBeenCalled();
    });

    it('does not dispatch to an inactive input group', () => {
      inputManager.setActiveGroup('menu');
      setPressedButtons(gamepadButtons.start);
      source.update();

      expect(pressListener).not.toHaveBeenCalled();
    });
  });

  describe('gamepaddisconnected', () => {
    it('releases everything the disconnected gamepad was driving', () => {
      const shootAction = new HoldAction('shoot', group);

      inputManager.addHoldActions(shootAction);

      const gamepad = createGamepad(
        [0.8, 0, 0, 0],
        pressButtons(gamepadButtons.faceButtonBottom),
      );

      source = createSource([gamepad]);
      source.axis1dBindings.add(
        new GamepadAxis1dBinding(moveAction, {
          axisIndex: gamepadAxes.leftStickX,
        }),
      );
      source.holdBindings.add(
        new GamepadHoldBinding(shootAction, gamepadButtons.faceButtonBottom),
      );

      source.update();
      expect(moveAction.value).toBeCloseTo(0.8);
      expect(shootAction.isHeld).toBe(true);

      getGamepadsSpy.mockReturnValue([]);
      dispatchGamepadEvent('gamepaddisconnected', gamepad);

      expect(moveAction.value).toBe(0);
      expect(shootAction.isHeld).toBe(false);
    });

    it('ignores a disconnect for a gamepad it is not reading from', () => {
      const gamepad = createGamepad([0.8, 0, 0, 0], []);
      const otherGamepad = createGamepad([0, 0, 0, 0], [], 1);

      source = createSource([gamepad, otherGamepad]);
      source.axis1dBindings.add(
        new GamepadAxis1dBinding(moveAction, {
          axisIndex: gamepadAxes.leftStickX,
        }),
      );

      source.update();
      getGamepadsSpy.mockReturnValue([gamepad]);
      dispatchGamepadEvent('gamepaddisconnected', otherGamepad);
      source.update();

      expect(moveAction.value).toBeCloseTo(0.8);
    });

    it('picks the gamepad back up when it reconnects at the same index', () => {
      const gamepad = createGamepad([0.8, 0, 0, 0], []);

      source = createSource([gamepad]);
      source.axis1dBindings.add(
        new GamepadAxis1dBinding(moveAction, {
          axisIndex: gamepadAxes.leftStickX,
        }),
      );

      source.update();
      getGamepadsSpy.mockReturnValue([]);
      dispatchGamepadEvent('gamepaddisconnected', gamepad);
      expect(moveAction.value).toBe(0);

      const reconnectedGamepad = createGamepad([0.6, 0, 0, 0], []);

      getGamepadsSpy.mockReturnValue([reconnectedGamepad]);
      dispatchGamepadEvent('gamepadconnected', reconnectedGamepad);
      source.update();

      expect(moveAction.value).toBeCloseTo(0.6);
    });

    it('falls back to another connected gamepad when constructed with index -1', () => {
      const firstGamepad = createGamepad([0.3, 0, 0, 0], [], 0);
      const lastGamepad = createGamepad([0.8, 0, 0, 0], [], 1);

      getGamepadsSpy.mockReturnValue([firstGamepad, lastGamepad]);
      source = new GamepadInputSource(inputManager, -1);
      source.axis1dBindings.add(
        new GamepadAxis1dBinding(moveAction, {
          axisIndex: gamepadAxes.leftStickX,
        }),
      );

      source.update();
      expect(moveAction.value).toBeCloseTo(0.8);

      // Some browsers may still list the disconnecting gamepad while the
      // event is dispatched, so it must be skipped explicitly.
      dispatchGamepadEvent('gamepaddisconnected', lastGamepad);
      getGamepadsSpy.mockReturnValue([firstGamepad]);
      source.update();

      expect(moveAction.value).toBeCloseTo(0.3);
    });

    it('releases what it held when stopped, and stops listening for disconnects', () => {
      const gamepad = createGamepad([0.8, 0, 0, 0], []);

      source = createSource([gamepad]);
      source.axis1dBindings.add(
        new GamepadAxis1dBinding(moveAction, {
          axisIndex: gamepadAxes.leftStickX,
        }),
      );

      source.update();
      source.stop();
      expect(moveAction.value).toBe(0);

      const removeSourceInputSpy = vi.spyOn(inputManager, 'removeSourceInput');

      dispatchGamepadEvent('gamepaddisconnected', gamepad);

      expect(removeSourceInputSpy).not.toHaveBeenCalled();
    });
  });

  it('reads a stick deflection made while its group was inactive once the group becomes active', () => {
    source = createSource([createGamepad([0.8, 0, 0, 0], [])]);

    source.axis1dBindings.add(
      new GamepadAxis1dBinding(moveAction, {
        axisIndex: gamepadAxes.leftStickX,
      }),
    );

    source.update();
    expect(moveAction.value).toBeCloseTo(0.8);

    inputManager.setActiveGroup('menu');
    expect(moveAction.value).toBe(0);

    getGamepadsSpy.mockReturnValue([createGamepad([-0.6, 0, 0, 0], [])]);
    source.update();
    expect(moveAction.value).toBe(0);

    inputManager.setActiveGroup(group);

    expect(moveAction.value).toBeCloseTo(-0.6);
  });

  it('does not start a hold whose button is already down when its group becomes active', () => {
    const shootAction = new HoldAction('shoot', group);

    inputManager.addHoldActions(shootAction);
    inputManager.setActiveGroup('menu');

    source = createSource([createGamepad([0, 0, 0, 0], pressButtons(0))]);
    source.holdBindings.add(new GamepadHoldBinding(shootAction, 0));

    source.update();
    inputManager.setActiveGroup(group);
    source.update();
    expect(shootAction.isHeld).toBe(false);

    getGamepadsSpy.mockReturnValue([createGamepad([0, 0, 0, 0], [])]);
    source.update();
    getGamepadsSpy.mockReturnValue([
      createGamepad([0, 0, 0, 0], pressButtons(0)),
    ]);
    source.update();

    expect(shootAction.isHeld).toBe(true);
  });
});
