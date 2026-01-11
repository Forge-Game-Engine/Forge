import { Brand } from '../utilities';

export type ComponentKey<T> = Brand<symbol, T>;
export type TagKey = ComponentKey<void>;

export function createComponentId<T>(name: string): ComponentKey<T> {
  return Symbol(name) as ComponentKey<T>;
}

export function createTagId(name: string): TagKey {
  return Symbol(name) as TagKey;
}
