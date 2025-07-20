import { Axis1dAction, TriggerAction } from './actions';
import { InputBinding } from './bindings';

/**
 * InputGroup represents a collection of input bindings that can be activated
 * together. It is used to group related input actions and manage their bindings.
 */
export class InputGroup {
  public readonly name: string;

  public readonly triggerActions: Set<TriggerAction>;
  public readonly axis1dActions: Set<Axis1dAction>;

  constructor(name: string) {
    this.name = name;

    this.triggerActions = new Set();
    this.axis1dActions = new Set();
  }

  public dispatchTriggerAction(binding: InputBinding): void {
    for (const action of this.triggerActions) {
      const actionBindings = action.bindings.get(this);

      if (!actionBindings) {
        continue;
      }

      for (const actionBinding of actionBindings) {
        if (actionBinding.matchesArgs(binding.args)) {
          action.trigger();
        }
      }
    }
  }

  public dispatchAxis1dAction(binding: InputBinding, value: number): void {
    for (const action of this.axis1dActions) {
      const actionBindings = action.bindings.get(this);

      if (!actionBindings) {
        continue;
      }

      for (const actionBinding of actionBindings) {
        if (actionBinding.matchesArgs(binding.args)) {
          action.set(value);
        }
      }
    }
  }
}
