/**
 * An object type with the properties of `T`, of which at least one of `Keys`
 * is required and the rest are optional.
 */
export type AtLeastOne<T, Keys extends keyof T = keyof T> = Keys extends keyof T
  ? Required<Pick<T, Keys>> & Partial<Omit<T, Keys>>
  : never;
