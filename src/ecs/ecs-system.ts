import { KeysFromComponents, TagKey } from './ecs-component.js';
import { EcsWorld, QueryResult } from './ecs-world.js';

/**
 * A unit of per-tick logic that operates on all entities matching its
 * `query` (and `tags`, if given) in a single batch call. Register an instance
 * with `EcsWorld.addSystem` to have `update` invoked every `EcsWorld.update` call.
 *
 * @typeParam TQuery - The tuple of component data types the system reads,
 * in query order. Matches the array of {@link ComponentKey}s in `query`.
 */
export interface EcsSystem<
  TQuery extends readonly unknown[] = readonly unknown[],
> {
  /**
   * The component keys an entity must have for this system to query it.
   * Order determines the order of arrays inside `queryResult.components`.
   */
  query: KeysFromComponents<TQuery>;

  /**
   * Additional tag keys an entity must have for this system to query it.
   * Unlike `query`, tags don't contribute values to `queryResult.components`.
   */
  tags?: TagKey[];

  /**
   * Invoked once when the system is registered with an `EcsWorld`. Use it to
   * acquire resources or set up state the system will need for its lifetime.
   *
   * @param world - The `EcsWorld` the system was registered with.
   */
  onRegister?(world: EcsWorld): void;

  /**
   * Invoked once per tick with all entities and components matching `query` (and `tags`).
   * The system handles its own iteration, enabling operations across all matched entities
   * (e.g., spatial partitioning, batching, or sorting).
   *
   * @param world - The `EcsWorld` running this system.
   * @param queryResult - The batch of matched entity IDs and their corresponding component data.
   */
  update(world: EcsWorld, queryResult: QueryResult<TQuery>): void;

  /**
   * Invoked once when the system is removed from an `EcsWorld` or when the world
   * is stopped via `EcsWorld.stop`. Use it to release resources acquired during
   * system lifetime or execution.
   *
   * @param world - The `EcsWorld` releasing the system.
   */
  cleanup?(world: EcsWorld): void;
}

/**
 * Priorities for `EcsWorld.addSystem`'s `registrationOrder` parameter.
 * Systems run in ascending numeric order; systems registered with the same
 * priority run in registration order.
 */
export const SystemRegistrationOrder = {
  early: -10_000,
  normal: 0,
  late: 10_000,
};
