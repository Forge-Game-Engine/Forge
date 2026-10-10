import { ComponentKey, KeysFromComponents, TagKey } from './ecs-component.js';
import type { EcsWorld } from './ecs-world.js';
import {
  NoQueries,
  QueryDeclarations,
  QueryResult,
  QueryResults,
} from './query-result.js';

/**
 * A unit of per-tick logic that operates on all entities matching its
 * declared queries in a single batch call. Register an instance with
 * `EcsWorld.addSystem` to have `update` invoked every `EcsWorld.update` call.
 *
 * A system declares every query it reads: the primary one (`query`, `tags`
 * and `without`) and any named secondary ones (`queries`). All of them are
 * fixed when the system is created. The world keeps each declaration's
 * matching entities up to date as components are added and removed, so a
 * tick costs time in proportion to what changed, not to how many entities
 * match.
 *
 * A system's closure holds the services and configuration its factory
 * received, and nothing written during one run that a later run reads.
 * State a later run needs goes in a component: on the entities it's about,
 * or in the subsystem's singleton (see `EcsWorld.addSingleton`).
 *
 * @typeParam TQuery - The tuple of component data types the primary query
 * reads, in query order. Matches the array of {@link ComponentKey}s in
 * `query`.
 * @typeParam TQueries - The component types of each named secondary query.
 */
export interface EcsSystem<
  TQuery extends readonly unknown[] = readonly unknown[],
  TQueries extends Record<string, readonly unknown[]> = NoQueries,
> {
  /**
   * An optional human-readable name, used to identify the system in error
   * messages (e.g. when a `before`/`after` ordering constraint given to
   * `EcsWorld.addSystem` can't be satisfied).
   */
  name?: string;

  /**
   * The component keys an entity must have for this system to query it.
   * Order determines the order of arrays inside `queryResult.components`.
   * An empty `query` with no `tags` matches no entity.
   */
  query: KeysFromComponents<TQuery>;

  /**
   * Additional tag keys an entity must have for this system to query it.
   * Unlike `query`, tags don't contribute values to `queryResult.components`.
   */
  tags?: readonly TagKey[];

  /**
   * Component or tag keys an entity must not have for this system to query
   * it.
   */
  without?: readonly ComponentKey<unknown>[];

  /**
   * Named secondary queries, each with its own `query`, `tags` and
   * `without`. Their results are passed to `update` as its third argument,
   * under the same names.
   */
  queries?: QueryDeclarations<TQueries>;

  /**
   * Invoked once when the system is registered with an `EcsWorld`. Use it to
   * acquire resources outside the ECS, such as DOM listeners. State that a
   * later run reads goes in a component, not in the system.
   *
   * @param world - The `EcsWorld` the system was registered with.
   */
  onRegister?(world: EcsWorld): void;

  /**
   * Invoked once per tick with all entities and components matching the
   * system's declared queries. The system handles its own iteration,
   * enabling operations across all matched entities (e.g., spatial
   * partitioning, batching, or sorting).
   *
   * @param world - The `EcsWorld` running this system.
   * @param queryResult - The result of the primary query.
   * @param queries - The results of the named secondary queries.
   */
  update(
    world: EcsWorld,
    queryResult: QueryResult<TQuery>,
    queries: QueryResults<TQueries>,
  ): void;

  /**
   * Invoked once when the system is removed from an `EcsWorld` or when the world
   * is stopped via `EcsWorld.stop`. Use it to release resources acquired during
   * system lifetime or execution.
   *
   * @param world - The `EcsWorld` releasing the system.
   */
  cleanup?(world: EcsWorld): void;
}
