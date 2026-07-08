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
  afterRun?(input: TAfterRunInput): void;
  beforeQuery?(world: EcsWorld): TBeforeQueryResult;
  cleanupEntities?(queryResult: QueryResult<TQuery>, world: EcsWorld): void;
}

export const SystemRegistrationOrder = {
  early: -10_000,
  normal: 0,
  late: 10_000,
};
