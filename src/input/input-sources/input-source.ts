import { Resettable, Stoppable } from '../../common';
import { InputAction } from '../input-types/input-action';

export type InputSource = Stoppable & Resettable;

export interface InputWithArgs<TInput extends InputAction, TArgs> {
  input: TInput;
  args: TArgs;
}
