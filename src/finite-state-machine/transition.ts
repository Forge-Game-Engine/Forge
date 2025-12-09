import { Predicate } from '../utilities/index.js';

export class Transition<TInput> {
  public readonly predicates: Predicate<TInput>[];

  constructor(...predicates: Predicate<TInput>[]) {
    this.predicates = predicates;
  }

  public satisfies(input: TInput): boolean {
    return this.predicates.every((predicate) => predicate(input));
  }
}
