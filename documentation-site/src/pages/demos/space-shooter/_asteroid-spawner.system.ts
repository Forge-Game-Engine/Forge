import { EcsSystem } from '@forge-game-engine/forge/ecs';
import {
  positionId,
  rotationId,
  scaleId,
  Time,
} from '@forge-game-engine/forge/common';
import { Random, Vector2 } from '@forge-game-engine/forge/math';
import { spriteId } from '@forge-game-engine/forge/rendering';
import {
  CircleShape,
  PhysicsBodyId,
  RigidBody,
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
  run: (result, world) => {
    const [spawnerComponent] = result.components;

    if (time.timeInSeconds < spawnerComponent.nextSpawnTime) {
      return;
    }

    spawnerComponent.nextSpawnTime =
      time.timeInSeconds + spawnerComponent.timeBetweenSpawns;

    const sprite =
      spawnerComponent.asteroidSprites[
        random.randomInt(0, spawnerComponent.asteroidSprites.length - 1)
      ];

    const x = random.randomFloat(spawnerComponent.minX, spawnerComponent.maxX);
    const rotationDirection = random.randomInt(0, 1) === 0 ? 1 : -1;

    const asteroidEntity = world.createEntity();

    world.addComponent(asteroidEntity, spriteId, sprite);

    world.addComponent(asteroidEntity, positionId, {
      local: new Vector2(x, spawnerComponent.spawnY),
      world: new Vector2(x, spawnerComponent.spawnY),
    });

    world.addComponent(asteroidEntity, rotationId, {
      local: 0,
      world: 0,
    });

    world.addComponent(asteroidEntity, scaleId, {
      local: new Vector2(asteroidScale, asteroidScale),
      world: new Vector2(asteroidScale, asteroidScale),
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

    world.addComponent(asteroidEntity, PhysicsBodyId, {
      physicsBody: new RigidBody({
        shape: new CircleShape(asteroidRadius),
        position: new Vector2(x, spawnerComponent.spawnY),
        isStatic: false,
        isSensor: true,
      }),
      isKinematic: true,
    });
  },
});
