import { getAssetUrl } from '@site/src/utils/get-asset-url';
import { EcsWorld } from '@forge-game-engine/forge/ecs';
import {
  createImageSprite,
  RenderContext,
} from '@forge-game-engine/forge/rendering';
import {
  AsteroidSpawnerEcsComponent,
  asteroidSpawnerId,
} from './_asteroid-spawner.component';

const asteroidImagePaths = [
  'img/space-shooter/Asteroid_1.png',
  'img/space-shooter/Asteroid_2.png',
  'img/space-shooter/Asteroid_3.png',
  'img/space-shooter/Asteroid_4.png',
  'img/space-shooter/Asteroid_5.png',
];

export async function createAsteroidSpawner(
  world: EcsWorld,
  renderContext: RenderContext,
  renderLayer: number,
): Promise<void> {
  const asteroidSprites = await Promise.all(
    asteroidImagePaths.map(async (imagePath) =>
      createImageSprite(
        await renderContext.imageCache.getOrLoad(getAssetUrl(imagePath)),
        renderContext,
        renderLayer,
      ),
    ),
  );

  const spawnerEntity = world.createEntity();

  const spawnerComponent: AsteroidSpawnerEcsComponent = {
    asteroidSprites,
    timeBetweenSpawns: 0.2,
    nextSpawnTime: 0,
    minX: -renderContext.canvas.width / 2,
    maxX: renderContext.canvas.width / 2,
    spawnY: renderContext.canvas.height / 2 + 100,
    speed: 100,
    rotationSpeed: Math.PI / 6,
  };

  world.addComponent(spawnerEntity, asteroidSpawnerId, spawnerComponent);
}
