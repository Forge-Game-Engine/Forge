export type Predicate<T> = (item: T) => boolean;
export type AsyncPredicate<T> = (item: T) => Promise<boolean>;
