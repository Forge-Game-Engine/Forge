import { KeysFromComponents, TagKey } from './ecs-component';
import { EcsWorld, QueryResult } from './ecs-world';

/**
 * A unit of per-tick logic that operates on every entity matching its
 * `query` (and `tags`, if given). Register an instance with
 * `EcsWorld.addSystem` to have `run` invoked for each matching entity every
 * `EcsWorld.update` call.
 * @typeParam TQuery - The tuple of component data types the system reads,
 * in query order. Matches the array of {@link ComponentKey}s in `query`.
 * @typeParam TBeforeQueryResult - The type returned by `beforeQuery` and
 * passed to every `run` call this tick. Defaults to `null` when
 * `beforeQuery` is not implemented.
 * @typeParam TAfterRunInput - The type returned by `run` and collected into
 * the array passed to `afterRun`. Defaults to `void` when `run` returns
 * nothing.
 */
export interface EcsSystem<
  TQuery extends readonly unknown[] = readonly unknown[],
  TBeforeQueryResult = null,
  TAfterRunInput = void,
> {
  /**
   * The component keys an entity must have for this system to process it.
   * Order determines the order of `queryResult.components` passed to `run`.
   */
  query: KeysFromComponents<TQuery>;
  /**
   * Additional tag keys an entity must have for this system to process it.
   * Unlike `query`, tags don't contribute a value to
   * `queryResult.components`.
   */
  tags?: TagKey[];
  /**
   * Invoked once when the system is registered with an `EcsWorld`. Use it to
   * acquire resources the system will need for its lifetime.
   * @param world - The `EcsWorld` the system was registered with.
   */
  onRegister?(world: EcsWorld): void;
  /**
   * Invoked once per tick for every entity matching `query` (and `tags`).
   * @param queryResult - The matched entity's id and its queried
   * component data, in query order.
   * @param world - The `EcsWorld` running this system.
   * @param beforeQueryResult - The value returned by `beforeQuery` for this
   * tick, or `null` if `beforeQuery` is not implemented.
   * @returns A value to be collected, along with every other matched
   * entity's return value this tick, into the array passed to `afterRun`.
   */
  run(
    queryResult: QueryResult<TQuery>,
    world: EcsWorld,
    beforeQueryResult: TBeforeQueryResult,
  ): TAfterRunInput;
  /**
   * Invoked once per tick, after `run` has been called for every matched
   * entity, with an array of every one of those calls' return values (in
   * query order; empty if nothing matched). Use it for work that needs to
   * see the whole tick's results together rather than one entity at a time:
   * for example the render system collects one `RenderPassResult` per
   * camera in `run`, then `afterRun` draws every camera's batch once all of
   * them are known.
   */
  afterRun?(inputs: TAfterRunInput[]): void;
  /**
   * Invoked once per tick, before entity iteration begins, to compute a
   * value shared across every `run` call this tick. Use it for expensive,
   * shared pre-computation (for example a spatial index) that would be
   * wasteful to redo for each matched entity.
   * @param world - The `EcsWorld` running this system.
   * @returns The value to pass as `beforeQueryResult` to every `run` call
   * this tick.
   */
  beforeQuery?(world: EcsWorld): TBeforeQueryResult;
  /**
   * Invoked for every entity still matching `query` (and `tags`) when the
   * owning `EcsWorld` is stopped via `EcsWorld.stop`. Use it to release
   * resources the system acquired for that entity.
   * @param queryResult - The matched entity's id and its queried
   * component data, in query order.
   * @param world - The `EcsWorld` that is stopping.
   */
  cleanupEntities?(queryResult: QueryResult<TQuery>, world: EcsWorld): void;
  /**
   * Invoked once when the system is removed from an `EcsWorld`. Use it to
   * release resources the system acquired for its lifetime.
   * @param world - The `EcsWorld` the system was removed from.
   */
  cleanupSystem?(world: EcsWorld): void;
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
