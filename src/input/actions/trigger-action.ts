import { InputBinding } from '../bindings/input-binding';
import { InputGroup } from '../input-group';
import { InputAction } from './input-action';

export class TriggerAction implements InputAction {
  public readonly name: string;

  public bindings: Map<InputGroup, Set<InputBinding>>;

  private _triggered: boolean = false;

  constructor(name: string) {
    this.name = name;
    this.bindings = new Map();
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

  public bind<TArgs>(binding: InputBinding<TArgs>, group: InputGroup): void {
    const existingBinding = this._findBindingById(binding.id, group);

    if (existingBinding) {
      console.warn(
        `Binding with ID ${binding.id} already exists in group "${group.name}". Not adding again.`,
      );

      return;
    }

    const groupBindings = this.bindings.get(group) ?? new Set<InputBinding>();

    groupBindings.add(binding);
    this.bindings.set(group, groupBindings);
  }

  private _findBindingById(id: string, group: InputGroup) {
    const groupBindings = this.bindings.get(group);

    if (!groupBindings) {
      return null;
    }

    for (const binding of groupBindings) {
      if (binding.id === id) {
        return binding;
      }
    }
  }
}
