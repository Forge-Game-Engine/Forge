import { createComponentId } from '@forge-game-engine/forge/ecs';
import { SpriteEcsComponent } from '@forge-game-engine/forge/rendering';

export interface StressTestSpawnerEcsComponent {
  /** The container entity new cells are parented to - carries the `GridLayoutGroupEcsComponent` they're arranged by. */
  container: number;
  /** The sprite each spawned cell is created with (cloned per cell by `createPanel`). */
  cellSprite: SpriteEcsComponent;
  batchSize: number;
  timeBetweenBatches: number;
  nextSpawnTime: number;
  spawnedCount: number;
  isSpawning: boolean;
}

export const stressTestSpawnerId =
  createComponentId<StressTestSpawnerEcsComponent>('stressTestSpawner');
