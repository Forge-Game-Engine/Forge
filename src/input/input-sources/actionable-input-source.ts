import { Stoppable } from '../../common';
import { InputAction } from '../input-types';

export interface ActionableInputSource<T> extends Stoppable {
  bindAction(inputAction: InputAction, args: T): void;
  reset(): void;
}
