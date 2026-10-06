import { clamp } from '../../math/index.js';
import { InputAction } from '../input-action.js';
import { ParameterizedForgeEvent } from '../../events/index.js';

let writeValue: (action: Axis1dAction, value: number) => void;

/**
 * An action that represents a 1-dimensional axis input, such as a gamepad
 * trigger or mouse scroll. Read-only to game code: its `InputManager`
 * derives its value from what the input sources bound to it report.
 */
export class Axis1dAction implements InputAction {
  public readonly name: string;

  /**
   * Event that is raised whenever the axis value changes.
   * The new value is passed as a parameter to the event listeners.
   */
  public readonly valueChangeEvent: ParameterizedForgeEvent<number>;

  public readonly inputGroup: string;

  private _value: number = 0;

  static {
    writeValue = (action, value): void => {
      const clampedValue = clamp(value, -1, 1);

      if (action._value === clampedValue) {
        return;
      }

      action._value = clampedValue;
      action.valueChangeEvent.raise(action._value);
    };
  }

  /**
   * Creates a new Axis1dAction.
   * @param name - The name of the action.
   * @param inputGroup - The input group this action belongs to. Defaults to `'game'`.
   */
  constructor(name: string, inputGroup?: string) {
    this.name = name;
    this.valueChangeEvent = new ParameterizedForgeEvent(
      'Axis1d Value Change Event',
    );
    this.inputGroup = inputGroup ?? 'game';
  }

  /** Gets the current value of the axis, ranging from -1 to 1. */
  get value(): number {
    return this._value;
  }
}

/**
 * Sets `action`'s value, clamped to the range -1 to 1, raising
 * `valueChangeEvent` if it changed. Internal to the input module and not
 * exported from it: `InputManager` is the only writer of action state.
 * @param action - The action to write.
 * @param value - The new value.
 */
export const setAxis1dActionValue = (
  action: Axis1dAction,
  value: number,
): void => {
  writeValue(action, value);
};
