import { createComponentId } from '@forge-game-engine/forge/ecs';
import { SpriteEcsComponent } from '@forge-game-engine/forge/rendering';

export interface AsteroidSpawnerEcsComponent {
  asteroidSprites: SpriteEcsComponent[];
  timeBetweenSpawns: number;
  nextSpawnTime: number;
  minX: number;
  maxX: number;
  spawnY: number;
  speed: number;
  rotationSpeed: number;
}

export const asteroidSpawnerId =
  createComponentId<AsteroidSpawnerEcsComponent>('AsteroidSpawner');
