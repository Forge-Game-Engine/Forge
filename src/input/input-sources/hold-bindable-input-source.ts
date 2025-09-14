import { HoldAction } from '../actions';
import { InputBinding } from '../bindings';
import { InputSource } from './input-source';

export interface HoldBindableInputSource<
  THoldBinding extends InputBinding<HoldAction>,
> extends InputSource {
  holdBindings: Set<THoldBinding>;
}
