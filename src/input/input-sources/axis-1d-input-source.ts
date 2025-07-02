import { InputAxis1d } from '../input-types';
import { InputSource } from './input-source';

export interface Axis1dInputSource<T = never> extends InputSource {
  bindAxis1d(inputAxis: InputAxis1d, args: T): void;
}
