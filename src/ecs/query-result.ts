import { ComponentKey, KeysFromComponents, TagKey } from './ecs-component.js';

/**
 * The entities matching a query, and their components, at one moment.
 * `EcsWorld.query` returns one built when it's called.
 * @typeParam T - The queried component types, in query order.
 */
export interface QueryMatches<T extends readonly unknown[]> {
  /** The matching entities' handles. */
  entities: readonly number[];

  /**
   * One array per queried component key, in query order: `components[k][i]`
   * is the component for key `k` of `entities[i]`.
   */
  components: { [K in keyof T]: T[K][] };
}

/**
 * What a system receives for one of its declared queries: the entities
 * matching it and their components, and what changed since the system last
 * ran.
 *
 * The arrays belong to the world and are reused from run to run. They don't
 * change while the `update` that received them runs, even if that `update`
 * adds or removes components or entities. Don't keep them after `update`
 * returns. Their order is unspecified: a system that needs an order sorts.
 * @typeParam T - The queried component types, in query order.
 */
export interface QueryResult<
  T extends readonly unknown[],
> extends QueryMatches<T> {
  /**
   * Entities that started matching since this system last ran. On a
   * system's first run, every matching entity. An entity whose component was
   * replaced with another object is in both `added` and `removed`, unless it
   * started matching since the last run, when it's only in `added`.
   */
  added: readonly number[];

  /**
   * Entities that stopped matching since this system last ran. They may no
   * longer be alive. An entity that stopped matching and then matched again
   * is in both `removed` and `added`: process `removed` first. An entity
   * that started and stopped matching between two runs is in neither.
   */
  removed: readonly number[];

  /**
   * `EcsWorld.changeTick` during this system's previous run, or `0` on its
   * first. A value stamped with a change tick greater than this changed
   * after the system last looked at it.
   */
  lastRunTick: number;
}

/**
 * One query a system declares: the components and tags an entity must have,
 * and the ones it must not have. Fixed when the system is created.
 * @typeParam T - The queried component types, in query order.
 */
export interface QueryDeclaration<T extends readonly unknown[]> {
  /**
   * The component keys an entity must have. Their components are returned
   * in this order.
   */
  query: KeysFromComponents<T>;

  /**
   * Tag keys an entity must also have. Unlike `query`, tags contribute no
   * arrays to `components`.
   */
  tags?: readonly TagKey[];

  /**
   * Component or tag keys an entity must not have. An entity that gains
   * one stops matching, and costs the system nothing while it has it.
   */
  without?: readonly ComponentKey<unknown>[];
}

/**
 * A system's named secondary queries: one {@link QueryDeclaration} per name.
 * @typeParam TQueries - The component types of each named query.
 */
export type QueryDeclarations<
  TQueries extends Record<string, readonly unknown[]>,
> = { [K in keyof TQueries]: QueryDeclaration<TQueries[K]> };

/**
 * The results of a system's named secondary queries, passed to its `update`
 * under the names they were declared with.
 * @typeParam TQueries - The component types of each named query.
 */
export type QueryResults<TQueries extends Record<string, readonly unknown[]>> =
  { readonly [K in keyof TQueries]: QueryResult<TQueries[K]> };

/**
 * The secondary queries of a system that declares none.
 */
export type NoQueries = Record<never, never>;
