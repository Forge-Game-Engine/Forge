import { EcsSystem } from '@forge-game-engine/forge/ecs';
import {
  addPositionComponent,
  addRotationComponent,
  addScaleComponent,
  Time,
} from '@forge-game-engine/forge/common';
import { Random } from '@forge-game-engine/forge/math';
import { addSpriteComponent } from '@forge-game-engine/forge/rendering';
import {
  addAabbComponent,
  addColliderComponent,
  CircleCollider,
} from '@forge-game-engine/forge/physics';
import {
  AsteroidSpawnerEcsComponent,
  asteroidSpawnerId,
} from './_asteroid-spawner.component';
import { asteroidId } from './_asteroid.component';

const asteroidScale = 0.1;

export const createAsteroidSpawnerEcsSystem = (
  time: Time,
  random: Random,
): EcsSystem<[AsteroidSpawnerEcsComponent]> => ({
  query: [asteroidSpawnerId],
  update: (world, { components: [spawnerComponents] }) => {
    for (const spawnerComponent of spawnerComponents) {
      if (time.timeInSeconds < spawnerComponent.nextSpawnTime) {
        continue;
      }

      spawnerComponent.nextSpawnTime =
        time.timeInSeconds + spawnerComponent.timeBetweenSpawns;

      const sprite =
        spawnerComponent.asteroidSprites[
          random.randomInt(0, spawnerComponent.asteroidSprites.length - 1)
        ];

      const x = random.randomFloat(
        spawnerComponent.minX,
        spawnerComponent.maxX,
      );
      const rotationDirection = random.randomInt(0, 1) === 0 ? 1 : -1;

      const asteroidEntity = world.createEntity();

      addSpriteComponent(world, asteroidEntity, sprite);

      addPositionComponent(world, asteroidEntity, {
        local: { x, y: spawnerComponent.spawnY },
        world: { x, y: spawnerComponent.spawnY },
      });

      addRotationComponent(world, asteroidEntity);

      addScaleComponent(world, asteroidEntity, {
        local: { x: asteroidScale, y: asteroidScale },
        world: { x: asteroidScale, y: asteroidScale },
      });

      world.addComponent(asteroidEntity, asteroidId, {
        speed: random.randomFloat(
          spawnerComponent.minSpeed,
          spawnerComponent.maxSpeed,
        ),
        rotationSpeed: spawnerComponent.rotationSpeed * rotationDirection,
      });

      const asteroidRadius =
        (sprite.width * asteroidScale + sprite.height * asteroidScale) / 4;

      addColliderComponent(world, asteroidEntity, {
        collider: new CircleCollider(asteroidRadius),
      });
      addAabbComponent(world, asteroidEntity);
    }
  },
});
