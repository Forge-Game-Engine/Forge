/**
 * A function that returns whether `item` matches a condition.
 */
export type Predicate<T> = (item: T) => boolean;
/**
 * A function that resolves to whether `item` matches a condition.
 */
export type AsyncPredicate<T> = (item: T) => Promise<boolean>;
