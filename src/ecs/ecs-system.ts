import { KeysFromComponents, TagKey } from './ecs-component';
import { EcsWorld, QueryResult } from './ecs-world';

export interface EcsSystem<
  TQuery extends readonly unknown[] = readonly unknown[],
  TBeforeQueryResult = null,
  TAfterRunInput = void,
> {
  query: KeysFromComponents<TQuery>;
  tags?: TagKey[];
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
  beforeQuery?(world: EcsWorld): TBeforeQueryResult;
  cleanupEntities?(queryResult: QueryResult<TQuery>, world: EcsWorld): void;
}

export const SystemRegistrationOrder = {
  early: -10_000,
  normal: 0,
  late: 10_000,
};
