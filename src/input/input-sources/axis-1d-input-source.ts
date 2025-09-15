import { Axis1dAction } from '../actions';
import { InputBinding } from '../input-binding';
import { InputSource } from '../input-source';

export interface Axis1dInputSource<
  TAxis1dBinding extends InputBinding<Axis1dAction>,
> extends InputSource {
  axis1dBindings: Set<TAxis1dBinding>;
}
