import { TriggerAction } from '../actions';
import { InputBinding } from '../bindings';
import { InputSource } from './input-source';

export interface TriggerBindableInputSource<
  TTriggerBinding extends InputBinding<TriggerAction>,
> extends InputSource {
  triggerBindings: Set<TTriggerBinding>;
}
