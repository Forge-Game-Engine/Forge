import { Axis1dAction } from '../actions';
import { InputSource } from './input-source';

export interface Axis1dInputSource<T = never> extends InputSource {
  bindAxis1d(inputAxis: Axis1dAction, args: T): void;
}
