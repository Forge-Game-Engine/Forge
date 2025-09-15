import { Vector2 } from '../../math';
import { ActionResetType, actionResetTypes } from '../constants';
import { InputAction } from '../input-action';
import { ParameterizedForgeEvent } from '../../events';
import { Resettable } from '../../common';

export class Axis2dAction implements InputAction, Resettable {
  public readonly name: string;
  public readonly valueChangeEvent: ParameterizedForgeEvent<Vector2>;

  public inputGroup: string | null;

  private readonly _value: Vector2 = Vector2.zero;
  private readonly _actionResetType: ActionResetType;

  constructor(
    name: string,
    actionResetType: ActionResetType = actionResetTypes.zero,
    inputGroup?: string,
  ) {
    this.name = name;

    this._actionResetType = actionResetType;

    this.valueChangeEvent = new ParameterizedForgeEvent(
      'Axis2d Value Change Event',
    );

    this.inputGroup = inputGroup ?? null;
  }

  public reset() {
    if (this._actionResetType === actionResetTypes.zero) {
      this.set(0, 0);
    }
  }

  get value(): Vector2 {
    return this._value;
  }

  public set(x: number, y: number) {
    if (this._value.x === x && this._value.y === y) {
      return;
    }

    this._value.x = x;
    this._value.y = y;

    this.valueChangeEvent.raise(this._value);
  }
}
