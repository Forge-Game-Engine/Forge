import { Transition } from './transition.js';

export interface State<TInput> {
  readonly name: string;
  readonly transitions: Transition<TInput>[];
}
