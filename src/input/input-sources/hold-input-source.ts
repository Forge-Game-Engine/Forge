import { HoldAction } from '../actions';
import { InputBinding } from '../input-binding';
import { InputSource } from '../input-source';

/** Represents a hold input source with associated bindings. */
export interface HoldInputSource<THoldBinding extends InputBinding<HoldAction>>
  extends InputSource {
  holdBindings: Set<THoldBinding>;
}
