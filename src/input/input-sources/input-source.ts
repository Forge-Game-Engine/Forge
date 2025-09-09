import { InputAction } from '../actions/input-action';

export interface InputSource {
  get name(): string;
}

export interface InputWithArgs<TInput extends InputAction, TArgs> {
  input: TInput;
  args: TArgs;
}
