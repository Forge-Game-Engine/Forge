import { Vector2 } from '../../math';
import { isNumber } from '../../utilities';
import { InputAction, InputBinding } from './input-action';

export class Axis2dAction implements InputAction {
  public readonly name: string;
  public readonly bindings: InputBinding[];

  private readonly _value: Vector2 = Vector2.zero;

  constructor(name: string) {
    this.name = name;
    this.bindings = [];
  }

  public bind(binding: InputBinding): void {
    this.bindings.push(binding);
  }

  public unbind(bindingId: string): void {
    const index = this.bindings.findIndex(
      (binding) => binding.bindingId === bindingId,
    );

    if (index !== -1) {
      this.bindings.splice(index, 1);
    }
  }

  public reset() {
    this._value.x = 0;
    this._value.y = 0;
  }

  public set(vector: Vector2): void;
  public set(x: number, y: number): void;
  public set(xOrVector: number | Vector2, y?: number): void {
    if (isNumber(xOrVector)) {
      this._value.x = xOrVector as number;
      this._value.y = y as number;

      return;
    }

    this._value.x = (xOrVector as Vector2).x;
    this._value.y = (xOrVector as Vector2).y;
  }

  get value(): Vector2 {
    return this._value;
  }
}
