import { InputAxis2d } from '../input-types';
import { InputSource } from './input-source';

export interface Axis2dInputSource<T> extends InputSource {
  bindAction(inputAxis: InputAxis2d, args: T): void;
}
