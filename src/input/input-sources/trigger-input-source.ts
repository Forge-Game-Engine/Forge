import { TriggerAction } from 'forge/input/actions';
import { InputBinding } from 'forge/input/input-binding';
import { InputSource } from 'forge/input/input-source';

/** Represents a trigger input source with associated bindings. */
export interface TriggerInputSource<
  TTriggerBinding extends InputBinding<TriggerAction>,
> extends InputSource {
  triggerBindings: Set<TTriggerBinding>;
}
