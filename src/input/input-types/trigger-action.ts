import { InputAction, InputBinding } from './input-action';

export class TriggerAction implements InputAction {
  public readonly name: string;
  public readonly bindings: InputBinding[];

  private _triggered: boolean = false;

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

  public trigger() {
    this._triggered = true;
  }

  public reset() {
    this._triggered = false;
  }

  get isTriggered(): boolean {
    return this._triggered;
  }
}
