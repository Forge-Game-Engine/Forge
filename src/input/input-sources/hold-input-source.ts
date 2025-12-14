import { HoldAction } from '../actions/index.js';
import { InputBinding } from '../input-binding.js';
import { InputSource } from '../input-source.js';

/** Represents a hold input source with associated bindings. */
export interface HoldInputSource<
  THoldBinding extends InputBinding<HoldAction>,
> extends InputSource {
  holdBindings: Set<THoldBinding>;
}
