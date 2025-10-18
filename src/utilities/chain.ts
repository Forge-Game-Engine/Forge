import { Prettify } from 'forge/common';

type UnknownFunction = (input: unknown) => unknown;

export class Chain<Input, Output = Input> {
  private readonly _functions: Array<UnknownFunction> = [];
  private readonly _initialState: Input;

  constructor(initialState: Input) {
    this._initialState = initialState;
  }

  public add<NextOutput>(
    fn: (input: Awaited<Output>) => NextOutput,
  ): Chain<Input, NextOutput> {
    this._functions.push(fn as UnknownFunction);

    return this as unknown as Chain<Input, NextOutput>;
  }

  public async execute(): Promise<Awaited<Prettify<Output>>> {
    let result: unknown = this._initialState;

    for (const fn of this._functions) {
      // eslint-disable-next-line no-await-in-loop
      result = await fn(result);
    }

    return result as Awaited<Output>;
  }
}
