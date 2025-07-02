import { InputAction } from '../input-types';
import { InputSource } from './input-source';

export interface ActionableInputSource<T> extends InputSource {
  bindAction(inputAction: InputAction, args: T): void;
}
