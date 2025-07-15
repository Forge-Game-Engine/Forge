import { Axis2dAction } from '../input-types';
import { InputSource } from './input-source';

export interface Axis2dInputSource<T = never> extends InputSource {
  bindAxis2d(inputAxis: Axis2dAction, args: T): void;
}
