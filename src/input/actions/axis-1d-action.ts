import { InputAction, InputBinding } from './input-action';

export class Axis1dAction implements InputAction {
  public readonly name: string;
  public readonly bindings: InputBinding[];

  private _value: number = 0;

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
    this._value = 0;
  }

  get value(): number {
    return this._value;
  }

  public set(value: number) {
    this._value = value;
  }
}
