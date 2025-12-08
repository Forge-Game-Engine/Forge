import { Predicate } from '../utilities/index.js';
import { State } from './state.js';

export class Transition<TInput> {
  public readonly toState: State<TInput>;
  public readonly predicates: Predicate<TInput>[];

  constructor(toState: State<TInput>, predicates: Predicate<TInput>[]) {
    this.toState = toState;
    this.predicates = predicates;
  }

  public satisfies(input: TInput): boolean {
    return this.predicates.every((predicate) => predicate(input));
  }
}
