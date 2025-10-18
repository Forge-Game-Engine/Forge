import { Axis2dAction } from 'forge/input/actions';
import { InputBinding } from 'forge/input/input-binding';
import { InputSource } from 'forge/input/input-source';

/** Represents a two-dimensional axis input source with associated bindings. */
export interface Axis2dInputSource<
  TAxis2dBinding extends InputBinding<Axis2dAction>,
> extends InputSource {
  axis2dBindings: Set<TAxis2dBinding>;
}
