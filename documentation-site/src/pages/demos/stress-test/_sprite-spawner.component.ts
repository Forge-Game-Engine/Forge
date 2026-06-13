import { createComponentId } from '@forge-game-engine/forge/ecs';
import { SpriteEcsComponent } from '@forge-game-engine/forge/rendering';

export interface SpriteSpawnerEcsComponent {
  sprite: SpriteEcsComponent;
  spriteScale: number;
  batchSize: number;
  timeBetweenBatches: number;
  nextSpawnTime: number;
  spawnedCount: number;
  isSpawning: boolean;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export const spriteSpawnerId =
  createComponentId<SpriteSpawnerEcsComponent>('spriteSpawner');
