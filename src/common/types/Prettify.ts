/* eslint-disable sonarjs/no-useless-intersection */
export type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};
