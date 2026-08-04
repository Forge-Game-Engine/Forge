import {
  addPositionComponent,
  addRotationComponent,
  addScaleComponent,
  Time,
} from '@forge-game-engine/forge/common';
import { EcsSystem } from '@forge-game-engine/forge/ecs';
import { Random, Vec2 } from '@forge-game-engine/forge/math';
import { addSpriteComponent } from '@forge-game-engine/forge/rendering';
import {
  SpriteSpawnerEcsComponent,
  spriteSpawnerId,
} from './_sprite-spawner.component';

/**
 * Spawns batches of sprites at random positions at a fixed interval, for as
 * long as the spawner is active.
 * @param time - The time instance used to throttle batch spawning.
 * @param random - The random instance used to position spawned sprites.
 */
export const createSpriteSpawnerEcsSystem = (
  time: Time,
  random: Random,
): EcsSystem<[SpriteSpawnerEcsComponent]> => ({
  query: [spriteSpawnerId],
  update: (world, { components: [spawners] }) => {
    for (const spawner of spawners) {
      if (!spawner.isSpawning || time.timeInSeconds < spawner.nextSpawnTime) {
        continue;
      }

      spawner.nextSpawnTime = time.timeInSeconds + spawner.timeBetweenBatches;

      for (let i = 0; i < spawner.batchSize; i++) {
        const position = { x: random.randomFloat(spawner.minX, spawner.maxX), y: random.randomFloat(spawner.minY, spawner.maxY) };

        const entity = world.createEntity();

        addPositionComponent(world, entity, {
          local: Vec2.clone(position),
          world: Vec2.clone(position),
        });

        addRotationComponent(world, entity);

        addScaleComponent(world, entity, {
          local: { x: spawner.spriteScale, y: spawner.spriteScale },
          world: { x: spawner.spriteScale, y: spawner.spriteScale },
        });

        addSpriteComponent(world, entity, spawner.sprite);

        spawner.spawnedCount += 1;
      }
    }
  },
});
