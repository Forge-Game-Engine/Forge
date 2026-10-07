import { Stoppable, Updatable } from '../../../common/index.js';
import { Axis1dAction, Axis2dAction, HoldAction } from '../../actions/index.js';
import { gamepadAxes, GamepadAxisIndex } from '../../constants/index.js';
import {
  Axis1dInputSource,
  Axis2dInputSource,
  HoldInputSource,
  TriggerInputSource,
} from '../../input-sources/index.js';
import { InputManager } from '../../input-manager.js';
import {
  GamepadAxis1dBinding,
  GamepadAxis2dBinding,
  GamepadHoldBinding,
  GamepadTriggerBinding,
} from '../bindings/index.js';

/**
 * Stick axis values within this range of `0` are treated as `0`, to ignore
 * resting drift on analog sticks. A 2D stick binding applies it to the
 * stick's overall deflection rather than to each axis separately.
 */
const gamepadAxisDeadzone = 0.15;

interface Axis2dValue {
  x: number;
  y: number;
}

const clampAxisValue = (value: number): number =>
  Math.max(-1, Math.min(1, value));

/**
 * The W3C Standard Gamepad reports a stick pushed up as `-1`, but the engine
 * is Y-up everywhere else (keyboard bindings, the D-pad's north button,
 * world space). These axes are negated as they're read, so a stick and
 * every other input agree on which way is up.
 */
const stickYAxes: ReadonlySet<GamepadAxisIndex> = new Set([
  gamepadAxes.leftStickY,
  gamepadAxes.rightStickY,
]);

/**
 * Reads a stick axis with up positive. Leaves `0` alone so an idle Y axis
 * reads `0` rather than `-0`.
 */
const readStickAxis = (
  gamepad: Gamepad,
  axisIndex: GamepadAxisIndex,
): number => {
  const rawValue = gamepad.axes[axisIndex] ?? 0;

  return stickYAxes.has(axisIndex) && rawValue !== 0 ? -rawValue : rawValue;
};

const isButtonPressed = (gamepad: Gamepad, buttonIndex: number): boolean =>
  gamepad.buttons[buttonIndex]?.pressed ?? false;

const readButtonValue = (gamepad: Gamepad, buttonIndex: number): number =>
  gamepad.buttons[buttonIndex]?.value ?? 0;

/**
 * Represents a gamepad input source with associated bindings.
 *
 * Unlike `KeyboardInputSource` and `MouseInputSource`, the Gamepad API has
 * no change events, so this source must be polled every frame. It registers
 * itself with the `InputManager` as an `Updatable` to do so.
 */
export class GamepadInputSource
  implements
    TriggerInputSource<GamepadTriggerBinding>,
    HoldInputSource<GamepadHoldBinding>,
    Axis1dInputSource<GamepadAxis1dBinding>,
    Axis2dInputSource<GamepadAxis2dBinding>,
    Updatable,
    Stoppable
{
  /** The name of this input source. */
  public readonly name = 'gamepad';
  /** The set of trigger bindings associated with this input source. */
  public readonly triggerBindings = new Set<GamepadTriggerBinding>();
  /** The set of hold bindings associated with this input source. */
  public readonly holdBindings = new Set<GamepadHoldBinding>();
  /** The set of 1D axis bindings associated with this input source. */
  public readonly axis1dBindings = new Set<GamepadAxis1dBinding>();
  /** The set of 2D axis bindings associated with this input source. */
  public readonly axis2dBindings = new Set<GamepadAxis2dBinding>();

  private readonly _inputManager: InputManager;
  private readonly _gamepadIndex: number;
  private _gamepad: Gamepad | null = null;

  /** Constructs a new GamepadInputSource.
   * @param inputManager - The input manager to register with.
   * @param gamepadIndex - The index of the gamepad to read from, as reported by `navigator.getGamepads()`. Defaults to `0`, the first connected gamepad. -1 will select the last connected gamepad, which is useful for hot-plugging a single gamepad.
   */
  constructor(inputManager: InputManager, gamepadIndex: number = 0) {
    this._inputManager = inputManager;

    this._inputManager.addUpdatable(this);
    this._gamepadIndex = gamepadIndex;
    this._gamepad = this._getGamepad();

    window.addEventListener('gamepadconnected', this._onGamepadConnected);
    window.addEventListener('gamepaddisconnected', this._onGamepadDisconnected);
  }

  /** Polls the gamepad and reports its current state for every binding to the `InputManager`. */
  public update(): void {
    if (!this._gamepad) {
      return;
    }

    // The Gamepad object cached on this instance is not updated in place in
    // every browser (e.g. Firefox), so a live reference must be re-fetched
    // from `navigator.getGamepads()` every frame. Reusing the cached object
    // would poll the same frozen axes/buttons values forever.
    const gamepad = navigator.getGamepads()[this._gamepad.index];

    if (!gamepad) {
      // The gamepad is gone (e.g. unplugged) without a
      // `gamepaddisconnected` event having been handled yet. Release
      // everything it was holding.
      this._inputManager.removeSourceInput(this);

      return;
    }

    this._updateAxis1dBindings(gamepad);
    this._updateAxis2dBindings(gamepad);
    this._updateHoldBindings(gamepad);
    this._updateTriggerBindings(gamepad);
  }

  /** Unregisters this source from the `InputManager`, releasing everything it was holding. */
  public stop(): void {
    window.removeEventListener('gamepadconnected', this._onGamepadConnected);
    window.removeEventListener(
      'gamepaddisconnected',
      this._onGamepadDisconnected,
    );
    this._inputManager.removeUpdatable(this);
    this._inputManager.removeSourceInput(this);
  }

  private readonly _onGamepadConnected = (event: GamepadEvent): void => {
    if (this._gamepad !== null) {
      return;
    }

    if (this._gamepadIndex === -1) {
      this._gamepad = event.gamepad;

      return;
    }

    if (this._gamepadIndex === event.gamepad.index) {
      this._gamepad = event.gamepad;
    }
  };

  private readonly _onGamepadDisconnected = (event: GamepadEvent): void => {
    if (this._gamepad?.index !== event.gamepad.index) {
      return;
    }

    this._inputManager.removeSourceInput(this);
    this._gamepad = null;

    // A source following the last-connected gamepad falls back to whichever
    // other gamepad is still connected, if any. A source pinned to an index
    // waits for a gamepad to connect at that index again.
    if (this._gamepadIndex === -1) {
      this._gamepad = this._getLastConnectedGamepad(event.gamepad.index);
    }
  };

  /** Gets the gamepad by index. If the id is -1, it will get the last connected gamepad */
  private _getGamepad(): Gamepad | null {
    if (this._gamepadIndex === -1) {
      return this._getLastConnectedGamepad();
    }

    return navigator.getGamepads()[this._gamepadIndex] ?? null;
  }

  private _getLastConnectedGamepad(excludedIndex?: number): Gamepad | null {
    const gamepads = navigator.getGamepads();

    // If the last-connected gamepad is requested, find it by iterating
    // backwards through the list of gamepads. This is necessary because
    // the Gamepad API doesn't provide a way to get the last-connected
    // gamepad directly.
    for (let i = gamepads.length - 1; i >= 0; i--) {
      const gamepad = gamepads[i];

      if (gamepad && gamepad.index !== excludedIndex) {
        return gamepad;
      }
    }

    return null;
  }

  private _updateAxis1dBindings(gamepad: Gamepad): void {
    // Multiple bindings (e.g. a stick and a D-pad) can target the same
    // action, so their values are combined per action and reported once,
    // rather than each binding reporting and overwriting the last.
    const combinedValuesByAction = new Map<Axis1dAction, number>();

    for (const binding of this.axis1dBindings) {
      const previousValue = combinedValuesByAction.get(binding.action) ?? 0;

      combinedValuesByAction.set(
        binding.action,
        previousValue + this._readAxis1dValue(gamepad, binding),
      );
    }

    for (const [action, value] of combinedValuesByAction) {
      this._inputManager.setAxis1dInput(this, action, clampAxisValue(value));
    }
  }

  private _updateAxis2dBindings(gamepad: Gamepad): void {
    // Combined per action, for the same reason as the 1D axis bindings above.
    const combinedValuesByAction = new Map<Axis2dAction, Axis2dValue>();

    for (const binding of this.axis2dBindings) {
      const previousValue = combinedValuesByAction.get(binding.action) ?? {
        x: 0,
        y: 0,
      };
      const bindingValue = this._readAxis2dValue(gamepad, binding);

      combinedValuesByAction.set(binding.action, {
        x: previousValue.x + bindingValue.x,
        y: previousValue.y + bindingValue.y,
      });
    }

    for (const [action, { x, y }] of combinedValuesByAction) {
      this._inputManager.setAxis2dInput(
        this,
        action,
        clampAxisValue(x),
        clampAxisValue(y),
      );
    }
  }

  private _updateHoldBindings(gamepad: Gamepad): void {
    // An action is held while any of its bindings' buttons is pressed, so
    // releasing one of two buttons bound to the same action (e.g. a face
    // button and a trigger both bound to "shoot") doesn't end the hold.
    const isDownByAction = new Map<HoldAction, boolean>();

    for (const binding of this.holdBindings) {
      const isDown =
        (isDownByAction.get(binding.action) ?? false) ||
        isButtonPressed(gamepad, binding.buttonIndex);

      isDownByAction.set(binding.action, isDown);
    }

    for (const [action, isDown] of isDownByAction) {
      this._inputManager.setHoldInput(this, action, isDown);
    }
  }

  private _updateTriggerBindings(gamepad: Gamepad): void {
    // The InputManager acts only on a binding's button changing state, so
    // reporting every poll fires each trigger once per press or release.
    for (const binding of this.triggerBindings) {
      this._inputManager.setTriggerInput(
        this,
        binding,
        isButtonPressed(gamepad, binding.buttonIndex),
      );
    }
  }

  private _readAxis1dValue(
    gamepad: Gamepad,
    binding: GamepadAxis1dBinding,
  ): number {
    const { source } = binding;

    if ('axisIndex' in source) {
      const value = readStickAxis(gamepad, source.axisIndex);

      return Math.abs(value) < gamepadAxisDeadzone ? 0 : value;
    }

    return (
      readButtonValue(gamepad, source.positiveButtonIndex) -
      readButtonValue(gamepad, source.negativeButtonIndex)
    );
  }

  private _readAxis2dValue(
    gamepad: Gamepad,
    binding: GamepadAxis2dBinding,
  ): Axis2dValue {
    const { source } = binding;

    if ('xAxisIndex' in source) {
      const x = readStickAxis(gamepad, source.xAxisIndex);
      const y = readStickAxis(gamepad, source.yAxisIndex);

      return Math.hypot(x, y) < gamepadAxisDeadzone ? { x: 0, y: 0 } : { x, y };
    }

    return {
      x:
        readButtonValue(gamepad, source.eastButtonIndex) -
        readButtonValue(gamepad, source.westButtonIndex),
      y:
        readButtonValue(gamepad, source.northButtonIndex) -
        readButtonValue(gamepad, source.southButtonIndex),
    };
  }
}
