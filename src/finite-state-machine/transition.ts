import { Predicate } from '../utilities/index.js';
import { State } from './state.js';

export class Transition<TInput, TState extends State> {
  public readonly toState: TState;
  public readonly predicates: Predicate<TInput>[];

  constructor(toState: TState, predicates: Predicate<TInput>[]) {
    this.toState = toState;
    this.predicates = predicates;
  }

  public satisfies(input: TInput): boolean {
    return this.predicates.every((predicate) => predicate(input));
  }
}
