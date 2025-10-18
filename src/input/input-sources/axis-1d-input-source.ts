import { Axis1dAction } from 'forge/input/actions';
import { InputBinding } from 'forge/input/input-binding';
import { InputSource } from 'forge/input/input-source';

/** Represents a one-dimensional axis input source with associated bindings. */
export interface Axis1dInputSource<
  TAxis1dBinding extends InputBinding<Axis1dAction>,
> extends InputSource {
  axis1dBindings: Set<TAxis1dBinding>;
}
