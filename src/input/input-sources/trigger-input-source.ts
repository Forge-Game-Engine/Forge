import { TriggerAction } from '../actions/index.js';
import { InputBinding } from '../input-binding.js';
import { InputSource } from '../input-source.js';

/** Represents a trigger input source with associated bindings. */
export interface TriggerInputSource<
  TTriggerBinding extends InputBinding<TriggerAction>,
> extends InputSource {
  triggerBindings: Set<TTriggerBinding>;
}
