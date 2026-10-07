import { Vec2, Vector2 } from '../../math/index.js';
import { InputAction } from '../input-action.js';
import { ParameterizedForgeEvent } from '../../events/index.js';

let writeValue: (action: Axis2dAction, x: number, y: number) => void;
let clearPresses: (action: Axis2dAction) => void;

/**
 * The length an `Axis2dAction`'s value has to reach to count as a press
 * (see `Axis2dAction.presses`): half of a fully pushed stick or a held key.
 */
export const axisPressThreshold = 0.5;

const isPressed = (x: number, y: number): boolean =>
  Math.hypot(x, y) >= axisPressThreshold;

/**
 * An action that represents a 2-dimensional axis input, such as a joystick
 * or mouse position. Read-only to game code: its `InputManager` derives its
 * value from what the input sources bound to it report.
 */
export class Axis2dAction implements InputAction {
  public readonly name: string;

  /**
   * Event that is raised whenever the axis value changes.
   * The new value is passed as a parameter to the event listeners.
   */
  public readonly valueChangeEvent: ParameterizedForgeEvent<Readonly<Vector2>>;

  public readonly inputGroup: string;

  private readonly _value: Vector2 = Vec2.zero;
  private readonly _presses: Vector2[] = [];

  static {
    writeValue = (action, x, y): void => {
      if (action._value.x === x && action._value.y === y) {
        return;
      }

      if (!isPressed(action._value.x, action._value.y) && isPressed(x, y)) {
        action._presses.push({ x, y });
      }

      action._value.x = x;
      action._value.y = y;
      action.valueChangeEvent.raise(action._value);
    };

    clearPresses = (action): void => {
      action._presses.length = 0;
    };
  }

  /**
   * Creates a new Axis2dAction.
   * @param name - The name of the action.
   * @param inputGroup - The input group this action belongs to. Defaults to `'game'`.
   */
  constructor(name: string, inputGroup?: string) {
    this.name = name;
    this.valueChangeEvent = new ParameterizedForgeEvent(
      'Axis2d Value Change Event',
    );
    this.inputGroup = inputGroup ?? 'game';
  }

  /**
   * Gets the current value of the axis. The `InputManager` updates this
   * vector in place, so copy it to keep a value from an earlier frame.
   */
  get value(): Readonly<Vector2> {
    return this._value;
  }

  /**
   * The value the axis had each time its length rose to
   * {@link axisPressThreshold} or more this frame, oldest first. Cleared at
   * the end of every frame by `InputManager.reset`.
   *
   * Use it to act on presses rather than on the current value, as UI focus
   * navigation does: a key pressed and released between two frames, which
   * `value` never shows, is still one press, and two taps in one frame are
   * two. Holding the axis past the threshold is one press, on the frame it
   * crossed.
   */
  get presses(): readonly Readonly<Vector2>[] {
    return this._presses;
  }
}

/**
 * Sets `action`'s value, raising `valueChangeEvent` if it changed. Internal
 * to the input module and not exported from it: `InputManager` is the only
 * writer of action state.
 * @param action - The action to write.
 * @param x - The new x value.
 * @param y - The new y value.
 */
export const setAxis2dActionValue = (
  action: Axis2dAction,
  x: number,
  y: number,
): void => {
  writeValue(action, x, y);
};

/**
 * Forgets `action`'s presses at the end of the frame. Internal to the
 * input module, see `setAxis2dActionValue`.
 * @param action - The action to clear.
 */
export const clearAxis2dActionPresses = (action: Axis2dAction): void => {
  clearPresses(action);
};
