import { createComponentId } from '@forge-game-engine/forge/ecs';
import { SpriteEcsComponent } from '@forge-game-engine/forge/rendering';

/**
 * Drops dynamic circles and boxes into the scene in batches at a fixed
 * interval, alternating between the two shapes.
 */
export interface BodySpawnerEcsComponent {
  circleSprite: SpriteEcsComponent;
  boxSprite: SpriteEcsComponent;
  minSize: number;
  maxSize: number;
  batchSize: number;
  timeBetweenBatches: number;
  nextSpawnTime: number;
  spawnedCount: number;

  /**
   * Whether the spawner drops bodies. Written by the FPS monitor, which turns
   * it on once it has measured the display's frame rate and off once the
   * last threshold is reached.
   */
  isSpawning: boolean;

  minX: number;
  maxX: number;
  spawnY: number;
}

export const bodySpawnerId =
  createComponentId<BodySpawnerEcsComponent>('bodySpawner');
