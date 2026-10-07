import { Brand } from '../utilities/index.js';

/**
 * The key a component is stored under in an `EcsWorld`. Its type parameter
 * types the data the world's component methods take and return for it.
 */
export type ComponentKey<T> = Brand<symbol, T>;

/**
 * The key a tag (a component with no data) is stored under in an
 * `EcsWorld`.
 */
export type TagKey = Brand<symbol, void>;

/**
 * Creates the key for a component type.
 * @param name - The component's name, shown in error messages.
 * @returns A new, unique component key.
 */
export function createComponentId<T>(name: string): ComponentKey<T> {
  return Symbol(name);
}

/**
 * Creates the key for a tag. Add a tag with `EcsWorld.addTag` and remove
 * it with `EcsWorld.removeComponent`.
 * @param name - The tag's name, shown in error messages.
 * @returns A new, unique tag key.
 */
export function createTagId(name: string): TagKey {
  return Symbol(name);
}

export type ComponentsFromKeys<Q extends readonly ComponentKey<unknown>[]> = {
  [I in keyof Q]: Q[I] extends ComponentKey<infer C> ? C : never;
};

export type KeysFromComponents<T extends readonly unknown[]> = {
  [I in keyof T]: ComponentKey<T[I]>;
};
