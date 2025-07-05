import { InputAxis2d } from '../input-types';
import { InputSource } from './input-source';

export interface Axis2dInputSource<T = never> extends InputSource {
  bindAxis2d(inputAxis: InputAxis2d, args: T): void;
}
