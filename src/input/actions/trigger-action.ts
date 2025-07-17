import { InputBinding } from '../input-binding';
import { InputAction } from './input-action';

export class TriggerAction implements InputAction {
  public readonly name: string;

  private _lastBindingTriggered: InputBinding<TriggerAction, unknown> | null =
    null;

  constructor(name: string) {
    this.name = name;
  }

  public trigger(binding: InputBinding<TriggerAction, unknown>): void {
    this._lastBindingTriggered = binding;
  }

  public reset() {
    this._lastBindingTriggered = null;
  }

  get lastBindingTriggered(): InputBinding<TriggerAction, unknown> | null {
    return this._lastBindingTriggered;
  }
}
