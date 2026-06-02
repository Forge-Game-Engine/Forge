import { Brand } from '../utilities/index.js';

export type ComponentKey<T> = Brand<symbol, T>;
export type TagKey = Brand<symbol, void>;

export function createComponentId<T>(name: string): ComponentKey<T> {
  return Symbol(name) as ComponentKey<T>;
}

export function createTagId(name: string): TagKey {
  return Symbol(name) as TagKey;
}

export type ComponentsFromKeys<Q extends readonly ComponentKey<unknown>[]> = {
  [I in keyof Q]: Q[I] extends ComponentKey<infer C> ? C : never;
};

export type KeysFromComponents<T extends readonly unknown[]> = {
  [I in keyof T]: ComponentKey<T[I]>;
};
