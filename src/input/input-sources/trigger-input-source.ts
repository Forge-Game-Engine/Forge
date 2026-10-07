import { InputSource } from '../input-source.js';
import { TriggerInputBinding } from '../trigger-input-binding.js';

/** Represents a trigger input source with associated bindings. */
export interface TriggerInputSource<
  TTriggerBinding extends TriggerInputBinding,
> extends InputSource {
  triggerBindings: Set<TTriggerBinding>;
}
