import { ActionResetType, actionResetTypes } from '../constants';
import { InputAction } from '../input-action';
import { ParameterizedForgeEvent } from '../../events';
import { Resettable } from '../../common';

export class Axis1dAction implements InputAction, Resettable {
  public readonly name: string;

  public readonly valueChangeEvent: ParameterizedForgeEvent<number>;
  public inputGroup: string;

  private _value: number = 0;
  private readonly _actionResetType: ActionResetType;

  constructor(
    name: string,
    inputGroup: string,
    actionResetType: ActionResetType = 'zero',
  ) {
    this.name = name;
    this._actionResetType = actionResetType;

    this.valueChangeEvent = new ParameterizedForgeEvent(
      'Axis1d Value Change Event',
    );

    this.inputGroup = inputGroup;
  }

  public reset() {
    if (this._actionResetType === actionResetTypes.zero) {
      this.set(0);
    }
  }

  get value(): number {
    return this._value;
  }

  public set(value: number) {
    if (this._value === value) {
      return;
    }

    this._value = value;

    this.valueChangeEvent.raise(this._value);
  }
}
