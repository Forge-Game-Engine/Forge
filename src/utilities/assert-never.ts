export function assertNever(x: never, msg?: string): never {
  throw new TypeError(msg ?? `Unhandled case: ${String(x)}`);
}
