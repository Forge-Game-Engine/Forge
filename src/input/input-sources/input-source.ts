import { InputAction } from '../actions/input-action';

export interface InputSource {
  name: string;
}

export interface InputWithArgs<TInput extends InputAction, TArgs> {
  input: TInput;
  args: TArgs;
}
