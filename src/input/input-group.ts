import { InputSource } from './input-sources';
import { TriggerAction } from './actions';
import { InputBinding } from './input-binding';

/**
 * InputGroup represents a collection of input bindings that can be activated
 * together. It is used to group related input actions and manage their bindings.
 */
export class InputGroup {
  public readonly name: string;

  public readonly triggerActionBindings: Set<
    InputBinding<TriggerAction, unknown>
  >;

  constructor(name: string) {
    this.name = name;

    this.triggerActionBindings = new Set();
  }

  public bindTriggerAction<TArgs>(
    binding: InputBinding<TriggerAction, TArgs>,
  ): void {
    for (const existingBinding of this.triggerActionBindings) {
      if (existingBinding.id === binding.id) {
        console.warn(
          `Binding with ID ${binding.id} already exists in group "${this.name}". Not adding again.`,
        );

        return;
      }
    }

    this.triggerActionBindings.add(binding);
  }

  public *getTriggerActionBindings(triggerAction: TriggerAction) {
    for (const binding of this.triggerActionBindings) {
      if (binding.action === triggerAction) {
        yield binding;
      }
    }
  }

  public removeTriggerActionBinding<TArgs>(
    binding: InputBinding<TriggerAction, TArgs>,
  ): boolean {
    return this.triggerActionBindings.delete(binding);
  }

  public *getTriggerActionBindingsForSource<TArgs>(
    source: InputSource,
  ): Iterable<InputBinding<TriggerAction, TArgs>> {
    for (const binding of this.triggerActionBindings) {
      if (binding.source === source) {
        yield binding as InputBinding<TriggerAction, TArgs>;
      }
    }
  }
}
