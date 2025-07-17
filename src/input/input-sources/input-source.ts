import { Resettable, Stoppable } from '../../common';
import { InputAction } from '../actions/input-action';

export type InputSource = Stoppable & Resettable;

export interface InputWithArgs<TInput extends InputAction, TArgs> {
  input: TInput;
  args: TArgs;
}
