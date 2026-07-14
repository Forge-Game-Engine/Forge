import { EcsWorld } from '@forge-game-engine/forge/ecs';
import {
  createImageSprite,
  RenderContext,
} from '@forge-game-engine/forge/rendering';
import { getAssetUrl } from '@site/src/utils/get-asset-url';
import {
  SpriteSpawnerEcsComponent,
  spriteSpawnerId,
} from './_sprite-spawner.component';

const batchSize = 100;
const timeBetweenBatches = 0.1;
const spriteScale = 0.25;

/**
 * Creates the entity that drives the stress test's sprite batch spawner.
 * @param world - The ECS world to add the spawner entity to.
 * @param renderContext - The render context used to load the sprite.
 * @param renderLayer - The render layer spawned sprites should be drawn on.
 */
export async function createSpriteSpawner(
  world: EcsWorld,
  renderContext: RenderContext,
  renderLayer: number,
): Promise<void> {
  const image = await renderContext.imageCache.getOrLoad(
    getAssetUrl('img/space-shooter/star_small.png'),
  );

  const sprite = createImageSprite(image, renderContext, renderLayer);

  const { width, height } = renderContext.canvas;
  const halfWidth = width / 2;
  const halfHeight = height / 2;

  const spawnerEntity = world.createEntity();

  const spawnerComponent: SpriteSpawnerEcsComponent = {
    sprite,
    spriteScale,
    batchSize,
    timeBetweenBatches,
    nextSpawnTime: 0,
    spawnedCount: 0,
    isSpawning: true,
    minX: -halfWidth,
    maxX: halfWidth,
    minY: -halfHeight,
    maxY: halfHeight,
  };

  world.addComponent(spawnerEntity, spriteSpawnerId, spawnerComponent);
}
