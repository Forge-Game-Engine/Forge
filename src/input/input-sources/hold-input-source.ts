import { HoldAction } from '../actions';
import { InputBinding } from '../input-binding';
import { InputSource } from '../input-source';

export interface HoldInputSource<THoldBinding extends InputBinding<HoldAction>>
  extends InputSource {
  holdBindings: Set<THoldBinding>;
}
