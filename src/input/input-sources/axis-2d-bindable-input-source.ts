import { Axis2dAction } from '../actions';
import { InputBinding } from '../bindings';
import { InputSource } from './input-source';

export interface Axis2dBindableInputSource<
  TAxis2dBinding extends InputBinding<Axis2dAction>,
> extends InputSource {
  axis2dBindings: Set<TAxis2dBinding>;
}
