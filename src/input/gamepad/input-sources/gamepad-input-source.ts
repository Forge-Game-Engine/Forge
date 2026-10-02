import { Stoppable, Updatable } from '../../../common/index.js';
import { Axis1dAction, Axis2dAction, HoldAction } from '../../actions/index.js';
import { buttonMoments } from '../../constants/index.js';
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
 * Negates `value` when `inverted` is set. Leaves `0` alone so an idle,
 * inverted axis reads `0` rather than `-0`.
 */
const applyInversion = (
  value: number,
  inverted: boolean | undefined,
): number => (inverted && value !== 0 ? -value : value);

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
  private readonly _lastDispatchedAxis1dValues = new Map<
    Axis1dAction,
    number
  >();
  private readonly _lastDispatchedAxis2dValues = new Map<
    Axis2dAction,
    Axis2dValue
  >();
  private readonly _heldActions = new Set<HoldAction>();
  private readonly _previouslyPressedButtons = new Set<number>();
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

  /** Polls the gamepad's current state and dispatches any bindings that read from it. */
  public update(): void {
    if (!this._gamepad) {
      return;
    }

    // The Gamepad object cached on this instance is not updated in place in
    // every browser (e.g. Firefox), so a live reference must be re-fetched
    // from `navigator.getGamepads()` every frame. Reusing the cached object
    // would poll the same frozen axes/buttons values forever, causing this
    // source to dispatch once and then never again.
    const gamepad = navigator.getGamepads()[this._gamepad.index];

    if (!gamepad) {
      // The gamepad is gone (e.g. unplugged) without a
      // `gamepaddisconnected` event having been handled yet. Release
      // everything it was driving, or a `noReset` axis or a hold would stay
      // stuck at whatever it was when the gamepad vanished.
      this._releaseAll();

      return;
    }

    this._updateAxis1dBindings(gamepad);
    this._updateAxis2dBindings(gamepad);
    this._updateHoldBindings(gamepad);
    this._updateTriggerBindings(gamepad);
  }

  /** Unregisters this source from the `InputManager`. */
  public stop(): void {
    window.removeEventListener('gamepadconnected', this._onGamepadConnected);
    window.removeEventListener(
      'gamepaddisconnected',
      this._onGamepadDisconnected,
    );
    this._inputManager.removeUpdatable(this);
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

    this._releaseAll();
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

  /**
   * Returns every action this source is currently driving to its idle
   * state: `0` for each axis it last set to something else, and the end of
   * each hold it started. Trigger bindings don't fire, since the gamepad
   * going away isn't the player releasing a button.
   */
  private _releaseAll(): void {
    for (const binding of this.axis1dBindings) {
      if ((this._lastDispatchedAxis1dValues.get(binding.action) ?? 0) === 0) {
        continue;
      }

      this._lastDispatchedAxis1dValues.set(binding.action, 0);
      this._inputManager.dispatchAxis1dAction(binding, 0);
    }

    for (const binding of this.axis2dBindings) {
      const lastValue = this._lastDispatchedAxis2dValues.get(binding.action);

      if (!lastValue || (lastValue.x === 0 && lastValue.y === 0)) {
        continue;
      }

      this._lastDispatchedAxis2dValues.set(binding.action, { x: 0, y: 0 });
      this._inputManager.dispatchAxis2dAction(binding, 0, 0);
    }

    for (const binding of this.holdBindings) {
      if (!this._heldActions.delete(binding.action)) {
        continue;
      }

      this._inputManager.dispatchHoldEndAction(binding);
    }

    this._previouslyPressedButtons.clear();
  }

  private _updateAxis1dBindings(gamepad: Gamepad): void {
    // Multiple bindings (e.g. a stick and a D-pad) can target the same
    // action, so their values are combined per-action rather than each
    // binding dispatching independently, which would let an idle binding
    // overwrite an active one later in iteration order.
    const combinedValuesByAction = new Map<Axis1dAction, number>();

    for (const binding of this.axis1dBindings) {
      const previousValue = combinedValuesByAction.get(binding.action) ?? 0;
      const combinedValue =
        previousValue + this._readAxis1dValue(gamepad, binding);

      combinedValuesByAction.set(binding.action, combinedValue);
    }

    const dispatchedActions = new Set<Axis1dAction>();

    for (const binding of this.axis1dBindings) {
      if (dispatchedActions.has(binding.action)) {
        continue;
      }

      dispatchedActions.add(binding.action);

      const combinedValue = combinedValuesByAction.get(binding.action) ?? 0;
      const clampedValue = clampAxisValue(combinedValue);

      // Only dispatch when this source's own contribution changes, the
      // same as the event-driven keyboard and mouse sources only calling
      // `set()` on a key/move event. Otherwise, dispatching the gamepad's
      // idle value every frame would fight with another source (e.g.
      // keyboard) bound to the same action, snapping it back to the
      // gamepad's value on the very next frame even when the gamepad isn't
      // being touched.
      if (
        this._lastDispatchedAxis1dValues.get(binding.action) === clampedValue
      ) {
        continue;
      }

      this._lastDispatchedAxis1dValues.set(binding.action, clampedValue);
      this._inputManager.dispatchAxis1dAction(binding, clampedValue);
    }
  }

  private _updateAxis2dBindings(gamepad: Gamepad): void {
    // Combined per-action and only dispatched on change, for the same
    // reasons as the 1D axis bindings above.
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

    const dispatchedActions = new Set<Axis2dAction>();

    for (const binding of this.axis2dBindings) {
      if (dispatchedActions.has(binding.action)) {
        continue;
      }

      dispatchedActions.add(binding.action);

      const combinedValue = combinedValuesByAction.get(binding.action) ?? {
        x: 0,
        y: 0,
      };
      const x = clampAxisValue(combinedValue.x);
      const y = clampAxisValue(combinedValue.y);
      const lastValue = this._lastDispatchedAxis2dValues.get(binding.action);

      if (lastValue?.x === x && lastValue.y === y) {
        continue;
      }

      this._lastDispatchedAxis2dValues.set(binding.action, { x, y });
      this._inputManager.dispatchAxis2dAction(binding, x, y);
    }
  }

  private _updateHoldBindings(gamepad: Gamepad): void {
    // An action is held while any of its bindings' buttons is pressed, so
    // releasing one of two buttons bound to the same action (e.g. a face
    // button and a trigger both bound to "shoot") doesn't end the hold.
    const heldBindingsByAction = new Map<HoldAction, GamepadHoldBinding>();
    const bindingsByAction = new Map<HoldAction, GamepadHoldBinding>();

    for (const binding of this.holdBindings) {
      bindingsByAction.set(binding.action, binding);

      if (isButtonPressed(gamepad, binding.buttonIndex)) {
        heldBindingsByAction.set(binding.action, binding);
      }
    }

    for (const [action, binding] of bindingsByAction) {
      const isHeld = heldBindingsByAction.has(action);

      // Only dispatch on a change in this source's own held state, so an
      // idle gamepad doesn't end a hold another source (e.g. keyboard)
      // started on the same action.
      if (isHeld === this._heldActions.has(action)) {
        continue;
      }

      if (isHeld) {
        this._heldActions.add(action);
        this._inputManager.dispatchHoldStartAction(binding);

        continue;
      }

      this._heldActions.delete(action);
      this._inputManager.dispatchHoldEndAction(binding);
    }
  }

  private _updateTriggerBindings(gamepad: Gamepad): void {
    // Triggers fire on the edge between two polls, so every bound button's
    // pressed state is compared against the previous poll's, then recorded
    // for the next one only after every binding has seen the comparison.
    const pressedButtons = new Set<number>();

    for (const binding of this.triggerBindings) {
      const isPressed = isButtonPressed(gamepad, binding.buttonIndex);
      const wasPressed = this._previouslyPressedButtons.has(
        binding.buttonIndex,
      );

      if (isPressed) {
        pressedButtons.add(binding.buttonIndex);
      }

      if (isPressed === wasPressed) {
        continue;
      }

      const moment = isPressed ? buttonMoments.down : buttonMoments.up;

      if (binding.moment === moment) {
        this._inputManager.dispatchTriggerAction(binding);
      }
    }

    this._previouslyPressedButtons.clear();

    for (const buttonIndex of pressedButtons) {
      this._previouslyPressedButtons.add(buttonIndex);
    }
  }

  private _readAxis1dValue(
    gamepad: Gamepad,
    binding: GamepadAxis1dBinding,
  ): number {
    const { source } = binding;

    if ('axisIndex' in source) {
      const rawValue = gamepad.axes[source.axisIndex] ?? 0;

      if (Math.abs(rawValue) < gamepadAxisDeadzone) {
        return 0;
      }

      return applyInversion(rawValue, source.inverted);
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
      const rawX = gamepad.axes[source.xAxisIndex] ?? 0;
      const rawY = gamepad.axes[source.yAxisIndex] ?? 0;

      if (Math.hypot(rawX, rawY) < gamepadAxisDeadzone) {
        return { x: 0, y: 0 };
      }

      return {
        x: applyInversion(rawX, source.invertX),
        y: applyInversion(rawY, source.invertY),
      };
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
