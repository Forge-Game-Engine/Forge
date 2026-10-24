import { EcsWorld } from '@forge-game-engine/forge/ecs';
import {
  createImageSprite,
  RenderContext,
} from '@forge-game-engine/forge/rendering';
import { getAssetUrl } from '@site/src/utils/get-asset-url';
import {
  BodySpawnerEcsComponent,
  bodySpawnerId,
} from './_body-spawner.component';
import { StressTestArena } from './_create-boundaries';

const batchSize = 10;
const timeBetweenBatches = 0.1;
const minSize = 8;
const maxSize = 14;

/**
 * Creates the entity that drops bodies into the arena. It starts with
 * spawning off: the FPS monitor turns it on once it has measured the
 * display's frame rate with an empty scene.
 * @param world - The ECS world to add the spawner entity to.
 * @param renderContext - The render context used to load the body sprites.
 * @param arena - The open area bodies are dropped into.
 * @param renderLayer - The render layer spawned bodies should be drawn on.
 * @returns The spawner entity.
 */
export async function createBodySpawner(
  world: EcsWorld,
  renderContext: RenderContext,
  arena: StressTestArena,
  renderLayer: number,
): Promise<number> {
  const [circleTexture, boxTexture] = await Promise.all([
    renderContext.textureCache.getOrLoad(
      getAssetUrl('img/physics/ball_blue_large.png'),
    ),
    renderContext.textureCache.getOrLoad(
      getAssetUrl('img/physics/block_square.png'),
    ),
  ]);

  const spawnerComponent: BodySpawnerEcsComponent = {
    circleSprite: {
      ...createImageSprite(circleTexture, { pixelsPerUnit: 1 }),
      category: renderLayer,
    },
    boxSprite: {
      ...createImageSprite(boxTexture, { pixelsPerUnit: 1 }),
      category: renderLayer,
    },
    minSize,
    maxSize,
    batchSize,
    timeBetweenBatches,
    nextSpawnTime: 0,
    spawnedCount: 0,
    isSpawning: false,
    minX: arena.minX,
    maxX: arena.maxX,
    spawnY: arena.top - maxSize,
  };

  const spawnerEntity = world.createEntity();

  world.addComponent(spawnerEntity, bodySpawnerId, spawnerComponent);

  return spawnerEntity;
}
