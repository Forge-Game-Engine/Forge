import { Axis1dAction } from '../actions';
import { InputBinding } from '../bindings';
import { InputSource } from './input-source';

export interface Axis1dBindableInputSource<
  TAxis1dBinding extends InputBinding<Axis1dAction>,
> extends InputSource {
  axis1dBindings: Set<TAxis1dBinding>;
}
