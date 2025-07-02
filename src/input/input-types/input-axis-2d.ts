import { Resettable } from '../../common';
import { Vector2 } from '../../math';
import { isNumber } from '../../utilities';

export class InputAxis2d implements Resettable {
  public readonly name: string;

  private readonly _value: Vector2 = Vector2.zero;

  constructor(name: string) {
    this.name = name;
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
