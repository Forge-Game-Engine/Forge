import { Brand } from '../utilities/index.js';
import {
  setComponentRemoveHook,
  UntypedComponentRemoveHook,
} from './component-hooks.js';
import type { EcsWorld } from './ecs-world.js';

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
 * Runs when a value stops being an entity's component for a key: the
 * component was removed with `removeComponent`, its entity (or one of the
 * entity's ancestors) was removed with `removeEntity`, or `addComponent`
 * stored a different value under the same key. It runs on replacement as
 * well as on removal, as Bevy's `on_replace` does (Bevy's `on_remove`,
 * flecs's `OnRemove` and EnTT's `on_destroy` don't run on replacement). It
 * doesn't run when a world is stopped or a system is removed, since neither
 * changes any component.
 *
 * The value is no longer stored when the hook runs: read it from
 * `component`. Use the hook to release what the component holds, such as a
 * GPU geometry. A hook uses only its arguments: it's part of the component
 * type, and every world calls it.
 * @param world - The world the value was removed from.
 * @param entity - The entity it belonged to. During `removeEntity` the
 * entity is no longer alive, but its other components are still stored
 * until every hook of the entity has run.
 * @param component - The value that was removed.
 */
export type ComponentRemoveHook<T> = (
  world: EcsWorld,
  entity: number,
  component: T,
) => void;

/**
 * Functions every world calls at points in a component type's life.
 */
export interface ComponentHooks<T> {
  /**
   * Runs when a value stops being an entity's component for this key:
   * removed, or replaced by a different value (see
   * {@link ComponentRemoveHook}).
   */
  onRemove?: ComponentRemoveHook<T>;
}

/**
 * Creates the key for a component type.
 * @param name - The component's name, shown in error messages.
 * @param hooks - Functions every world calls for this component type.
 * Defaults to none.
 * @returns A new, unique component key.
 */
export function createComponentId<T>(
  name: string,
  hooks: ComponentHooks<T> = {},
): ComponentKey<T> {
  const key = Symbol(name);

  if (hooks.onRemove) {
    // The world stores every component as `unknown`, and only ever passes
    // this hook values stored under this key, which are `T`s.
    setComponentRemoveHook(key, hooks.onRemove as UntypedComponentRemoveHook);
  }

  return key;
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
