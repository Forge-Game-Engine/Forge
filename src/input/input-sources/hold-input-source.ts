import { HoldAction } from 'forge/input/actions';
import { InputBinding } from 'forge/input/input-binding';
import { InputSource } from 'forge/input/input-source';

/** Represents a hold input source with associated bindings. */
export interface HoldInputSource<THoldBinding extends InputBinding<HoldAction>>
  extends InputSource {
  holdBindings: Set<THoldBinding>;
}
