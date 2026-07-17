import { Stoppable, Updatable } from '../../../common/index.js';
import { Axis1dAction } from '../../actions/index.js';
import { Axis1dInputSource } from '../../input-sources/index.js';
import { InputManager } from '../../input-manager.js';
import { GamepadAxis1dBinding } from '../bindings/index.js';

/**
 * Stick axis values within this range of `0` are treated as `0`, to ignore
 * resting drift on analog sticks.
 */
const gamepadAxisDeadzone = 0.15;

/**
 * Represents a gamepad input source with associated bindings.
 *
 * Unlike `KeyboardInputSource` and `MouseInputSource`, the Gamepad API has
 * no change events, so this source must be polled every frame. It registers
 * itself with the `InputManager` as an `Updatable` to do so.
 */
export class GamepadInputSource
  implements Axis1dInputSource<GamepadAxis1dBinding>, Updatable, Stoppable
{
  /** The name of this input source. */
  public readonly name = 'gamepad';
  /** The set of 1D axis bindings associated with this input source. */
  public readonly axis1dBindings = new Set<GamepadAxis1dBinding>();

  private readonly _inputManager: InputManager;
  private readonly _lastDispatchedValues = new Map<Axis1dAction, number>();
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
      return;
    }

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
      const clampedValue = Math.max(-1, Math.min(1, combinedValue));

      // Only dispatch when this source's own contribution changes, the
      // same as the event-driven keyboard and mouse sources only calling
      // `set()` on a key/move event. Otherwise, dispatching the gamepad's
      // idle value every frame would fight with another source (e.g.
      // keyboard) bound to the same action, snapping it back to the
      // gamepad's value on the very next frame even when the gamepad isn't
      // being touched.
      if (this._lastDispatchedValues.get(binding.action) === clampedValue) {
        continue;
      }

      this._lastDispatchedValues.set(binding.action, clampedValue);
      this._inputManager.dispatchAxis1dAction(binding, clampedValue);
    }
  }

  /** Unregisters this source from the `InputManager`. */
  public stop(): void {
    window.removeEventListener('gamepadconnected', this._onGamepadConnected);
    this._inputManager.removeUpdatable(this);
  }

  private readonly _onGamepadConnected = (event: GamepadEvent): void => {
    // TODO: Do we need a disconnect?
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

  /** Gets the gamepad by index. If the id is -1, it will get the last connected gamepad */
  private _getGamepad(): Gamepad | null {
    if (this._gamepadIndex === -1) {
      return this._getLastConnectedGamepad();
    }

    return navigator.getGamepads()[this._gamepadIndex] ?? null;
  }

  private _getLastConnectedGamepad(): Gamepad | null {
    const gamepads = navigator.getGamepads();

    // If the last-connected gamepad is requested, find it by iterating
    // backwards through the list of gamepads. This is necessary because
    // the Gamepad API doesn't provide a way to get the last-connected
    // gamepad directly.
    for (let i = gamepads.length - 1; i >= 0; i--) {
      if (gamepads[i]) {
        return gamepads[i];
      }
    }

    return null;
  }

  private _readAxis1dValue(
    gamepad: Gamepad,
    binding: GamepadAxis1dBinding,
  ): number {
    const { source } = binding;

    if ('axisIndex' in source) {
      const rawValue = gamepad.axes[source.axisIndex] ?? 0;

      return Math.abs(rawValue) < gamepadAxisDeadzone ? 0 : rawValue;
    }

    const positiveValue =
      gamepad.buttons[source.positiveButtonIndex]?.value ?? 0;
    const negativeValue =
      gamepad.buttons[source.negativeButtonIndex]?.value ?? 0;

    return positiveValue - negativeValue;
  }
}
