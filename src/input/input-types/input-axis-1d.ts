import { Resettable } from '../../common';

export class InputAxis1d implements Resettable {
  public readonly name: string;

  private _value: number = 0;

  constructor(name: string) {
    this.name = name;
  }

  public reset() {
    this._value = 0;
  }

  get value(): number {
    return this._value;
  }

  public set(value: number) {
    this._value = value;
  }
}
