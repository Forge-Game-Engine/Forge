import { KeysFromComponents, TagKey } from './ecs-component';
import { EcsWorld, QueryResult } from './ecs-world';

export interface EcsSystem<
  Q extends readonly unknown[] = readonly unknown[],
  K = null,
> {
  query: KeysFromComponents<Q>;
  tags?: TagKey[];
  run(components: QueryResult<Q>, world: EcsWorld, beforeQueryResult: K): void;
  beforeQuery?(world: EcsWorld): K;
}

export const SystemRegistrationOrder = {
  early: -10_000,
  normal: 0,
  late: 10_000,
};
