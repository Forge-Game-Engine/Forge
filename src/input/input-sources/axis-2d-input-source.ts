import { Axis2dAction } from '../actions/index.js';
import { InputBinding } from '../input-binding.js';
import { InputSource } from '../input-source.js';

/** Represents a two-dimensional axis input source with associated bindings. */
export interface Axis2dInputSource<
  TAxis2dBinding extends InputBinding<Axis2dAction>,
> extends InputSource {
  axis2dBindings: Set<TAxis2dBinding>;
}
