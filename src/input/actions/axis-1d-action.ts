import { InputBinding } from '../bindings';
import { ActionResetType, actionResetTypes } from '../constants';
import { InputGroup } from '../input-group';
import { InputAction } from './input-action';

export class Axis1dAction implements InputAction {
  public readonly name: string;

  public bindings: Map<InputGroup, Set<InputBinding>>;

  private _value: number = 0;
  private readonly _actionResetType: ActionResetType;

  constructor(name: string, actionResetType: ActionResetType = 'zero') {
    this.name = name;
    this.bindings = new Map<InputGroup, Set<InputBinding>>();
    this._actionResetType = actionResetType;
  }

  public reset() {
    this._value =
      this._actionResetType === actionResetTypes.zero ? 0 : this._value;
  }

  get value(): number {
    return this._value;
  }

  public set(value: number) {
    this._value = value;
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
    group.axis1dActions.add(this);
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
