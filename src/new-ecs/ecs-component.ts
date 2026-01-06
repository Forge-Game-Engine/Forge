import { Brand } from '../utilities';

export type ComponentKey<T> = Brand<symbol, T>;

export function createComponentId<T>(name: string): ComponentKey<T> {
  return Symbol(name) as ComponentKey<T>;
}
