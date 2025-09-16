import { TriggerAction } from '../actions';
import { InputBinding } from '../input-binding';
import { InputSource } from '../input-source';

/** Represents a trigger input source with associated bindings. */
export interface TriggerInputSource<
  TTriggerBinding extends InputBinding<TriggerAction>,
> extends InputSource {
  triggerBindings: Set<TTriggerBinding>;
}
