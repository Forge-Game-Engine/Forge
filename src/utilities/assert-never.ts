/**
 * Marks a code path that the type checker proves unreachable, such as the
 * fallthrough after every member of a union has been handled. Passing a value
 * that isn't `never` is a type error.
 * @param x - The value that should have been narrowed to `never`.
 * @param msg - The error message. Defaults to `Unhandled case: <x>`.
 * @returns Never returns.
 * @throws A `TypeError` whenever it's called at runtime.
 */
export function assertNever(x: never, msg?: string): never {
  throw new TypeError(msg ?? `Unhandled case: ${String(x)}`);
}
