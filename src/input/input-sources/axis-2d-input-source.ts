import { Axis2dAction } from '../actions';
import { InputBinding } from '../input-binding';
import { InputSource } from '../input-source';

export interface Axis2dInputSource<
  TAxis2dBinding extends InputBinding<Axis2dAction>,
> extends InputSource {
  axis2dBindings: Set<TAxis2dBinding>;
}
