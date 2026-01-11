import { EcsWorld, QueryResult } from './ecs-world';

export interface EcsSystem<T extends unknown[] = unknown[], K = void> {
  query: symbol[];
  run(components: QueryResult<T>, world: EcsWorld, beforeQueryResult: K): void;
  beforeQuery?(world: EcsWorld): K;
}
