import { Vector2 } from '../../math';
import { ActionResetType, actionResetTypes } from '../constants';
import { InputAction } from '../input-action';
import { ParameterizedForgeEvent } from '../../events';
import { Resettable } from '../../common';

/**
 * An action that represents a 2-dimensional axis input, such as a joystick or mouse position.
 */
export class Axis2dAction implements InputAction, Resettable {
  public readonly name: string;

  /**
   * Event that is raised whenever the axis value changes.
   * The new value is passed as a parameter to the event listeners.
   */
  public readonly valueChangeEvent: ParameterizedForgeEvent<Vector2>;

  public inputGroup: string;

  private readonly _value: Vector2 = Vector2.zero;
  private readonly _actionResetType: ActionResetType;

  /**
   * Creates a new Axis2dAction.
   * @param name - The name of the action.
   * @param inputGroup - The input group this action belongs to.
   * @param actionResetType - The type of reset behavior for this action. Defaults to `actionResetTypes.zero`.
   */
  constructor(
    name: string,
    inputGroup: string,
    actionResetType: ActionResetType = actionResetTypes.zero,
  ) {
    this.name = name;

    this._actionResetType = actionResetType;

    this.valueChangeEvent = new ParameterizedForgeEvent(
      'Axis2d Value Change Event',
    );

    this.inputGroup = inputGroup;
  }

  public reset() {
    if (this._actionResetType === actionResetTypes.zero) {
      this.set(0, 0);
    }
  }

  /** Gets the current value of the axis as a Vector2, where x and y range from -1 to 1. */
  get value(): Vector2 {
    return this._value;
  }

  /** Sets the current value of the axis as a Vector2, where x and y range from -1 to 1. */
  public set(x: number, y: number) {
    if (this._value.x === x && this._value.y === y) {
      return;
    }

    this._value.x = x;
    this._value.y = y;

    this.valueChangeEvent.raise(this._value);
  }
}
