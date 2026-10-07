/**
 * The same type as `T`, with intersections flattened into a single object
 * type so editors show its properties.
 */
export type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};
