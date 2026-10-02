import { ActionResetType, actionResetTypes } from '../constants/index.js';
import { clamp } from '../../math/index.js';
import { InputAction } from '../input-action.js';
import { ParameterizedForgeEvent } from '../../events/index.js';
import { Resettable } from '../../common/index.js';

/**
 * An action that represents a 1-dimensional axis input, such as a gamepad trigger or mouse scroll.
 */
export class Axis1dAction implements InputAction, Resettable {
  public readonly name: string;

  /**
   * Event that is raised whenever the axis value changes.
   * The new value is passed as a parameter to the event listeners.
   */
  public readonly valueChangeEvent: ParameterizedForgeEvent<number>;
  public inputGroup: string;

  private _value: number = 0;
  private readonly _actionResetType: ActionResetType;

  /**
   * Creates a new Axis1dAction.
   * @param inputGroup - The input group this action belongs to.
   * @param name - The name of the action.
   * @param actionResetType - The type of reset behavior for this action. Defaults to `actionResetTypes.zero`.
   */
  constructor(
    name: string,
    inputGroup?: string,
    actionResetType: ActionResetType = actionResetTypes.zero,
  ) {
    this.name = name;
    this._actionResetType = actionResetType;

    this.valueChangeEvent = new ParameterizedForgeEvent(
      'Axis1d Value Change Event',
    );

    this.inputGroup = inputGroup ?? 'game';
  }

  public reset(): void {
    if (this._actionResetType === actionResetTypes.zero) {
      this.set(0);
    }
  }

  /** Gets the current value of the axis, ranging from -1 to 1. */
  get value(): number {
    return this._value;
  }

  /** Gets how this action behaves when the `InputManager` resets its actions each frame. */
  get actionResetType(): ActionResetType {
    return this._actionResetType;
  }

  /**
   * Sets the current value of the axis.
   * @param value - The new value, clamped to the range -1 to 1.
   */
  public set(value: number): void {
    const clampedValue = clamp(value, -1, 1);

    if (this._value === clampedValue) {
      return;
    }

    this._value = clampedValue;

    this.valueChangeEvent.raise(this._value);
  }
}
