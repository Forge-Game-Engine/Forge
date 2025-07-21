import { Vector2 } from '../../math';
import { InputBinding } from '../bindings';
import { ActionResetType, actionResetTypes } from '../constants';
import { InputGroup } from '../input-group';
import { InputAction } from './input-action';

export class Axis2dAction implements InputAction {
  public readonly name: string;

  public bindings: Map<InputGroup, Set<InputBinding>>;

  private _value: Vector2 = Vector2.zero;
  private readonly _actionResetType: ActionResetType;

  constructor(name: string, actionResetType: ActionResetType = 'zero') {
    this.name = name;
    this.bindings = new Map<InputGroup, Set<InputBinding>>();
    this._actionResetType = actionResetType;
  }

  public reset() {
    if (this._actionResetType === actionResetTypes.zero) {
      this._value.x = 0;
      this._value.y = 0;
    }
  }

  get value(): Vector2 {
    return this._value;
  }

  public set(value: Vector2) {
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
    group.axis2dActions.add(this);
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
