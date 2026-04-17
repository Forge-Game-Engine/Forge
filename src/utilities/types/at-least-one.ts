export type AtLeastOne<T, Keys extends keyof T = keyof T> = Keys extends keyof T
  ? Required<Pick<T, Keys>> & Partial<Omit<T, Keys>>
  : never;
