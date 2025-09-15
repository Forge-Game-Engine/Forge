import { TriggerAction } from '../actions';
import { InputBinding } from '../input-binding';
import { InputSource } from '../input-source';

export interface TriggerInputSource<
  TTriggerBinding extends InputBinding<TriggerAction>,
> extends InputSource {
  triggerBindings: Set<TTriggerBinding>;
}
