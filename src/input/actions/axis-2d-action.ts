import { Vec2, Vector2 } from '../../math/index.js';
import { InputAction } from '../input-action.js';
import { ParameterizedForgeEvent } from '../../events/index.js';

let writeValue: (action: Axis2dAction, x: number, y: number) => void;

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

  static {
    writeValue = (action, x, y): void => {
      if (action._value.x === x && action._value.y === y) {
        return;
      }

      action._value.x = x;
      action._value.y = y;
      action.valueChangeEvent.raise(action._value);
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
