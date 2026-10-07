import { Prettify } from '../common/index.js';

type UnknownFunction = (input: unknown) => unknown;

/**
 * A sequence of functions run in order on an initial value: each function
 * receives the awaited result of the one before it.
 */
export class Chain<Input, Output = Input> {
  private readonly _functions: Array<UnknownFunction> = [];
  private readonly _initialState: Input;

  /**
   * Creates a chain that starts from `initialState`.
   * @param initialState - The value passed to the first function.
   */
  constructor(initialState: Input) {
    this._initialState = initialState;
  }

  /**
   * Appends a function to the chain.
   * @param fn - The function to run on the previous function's awaited result.
   * @returns This chain, typed with `fn`'s output.
   */
  public add<NextOutput>(
    fn: (input: Awaited<Output>) => NextOutput,
  ): Chain<Input, NextOutput> {
    this._functions.push(fn as UnknownFunction);

    return this as unknown as Chain<Input, NextOutput>;
  }

  /**
   * Runs every function in the order they were added, awaiting each one.
   * @returns The awaited result of the last function, or the initial value if
   * the chain has no functions.
   */
  public async execute(): Promise<Awaited<Prettify<Output>>> {
    let result: unknown = this._initialState;

    for (const fn of this._functions) {
      // eslint-disable-next-line no-await-in-loop
      result = await fn(result);
    }

    return result as Awaited<Output>;
  }
}
