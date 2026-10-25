import {
  addPositionComponent,
  addRotationComponent,
  addScaleComponent,
  Time,
} from '@forge-game-engine/forge/common';
import { EcsSystem, EcsWorld } from '@forge-game-engine/forge/ecs';
import { Random, Vector2 } from '@forge-game-engine/forge/math';
import {
  addColliderComponent,
  addGravityComponent,
  addRigidBodyComponent,
  CircleCollider,
  PolygonCollider,
} from '@forge-game-engine/forge/physics';
import { addSpriteComponent } from '@forge-game-engine/forge/rendering';
import {
  BodySpawnerEcsComponent,
  bodySpawnerId,
} from './_body-spawner.component';

const gravity = { x: 0, y: 300 };

function squareVertices(size: number): Vector2[] {
  const half = size / 2;

  return [
    { x: -half, y: -half },
    { x: half, y: -half },
    { x: half, y: half },
    { x: -half, y: half },
  ];
}

function spawnBody(
  world: EcsWorld,
  spawner: BodySpawnerEcsComponent,
  random: Random,
): void {
  const size = random.randomFloat(spawner.minSize, spawner.maxSize);
  const halfSize = size / 2;
  const isCircle = spawner.spawnedCount % 2 === 0;
  const sprite = isCircle ? spawner.circleSprite : spawner.boxSprite;
  const scale = size / sprite.height;

  const entity = world.createEntity();

  addPositionComponent(world, entity, {
    local: {
      x: random.randomFloat(spawner.minX + halfSize, spawner.maxX - halfSize),
      y: spawner.spawnY,
    },
  });
  addRotationComponent(world, entity);
  addScaleComponent(world, entity, { local: { x: scale, y: scale } });
  addSpriteComponent(world, entity, sprite);
  addColliderComponent(world, entity, {
    collider: isCircle
      ? new CircleCollider(halfSize)
      : new PolygonCollider(squareVertices(size)),
    restitution: 0.1,
  });
  addRigidBodyComponent(world, entity);
  addGravityComponent(world, entity, { amount: gravity });
}

/**
 * Spawns a batch of dynamic bodies just above the view at a fixed
 * interval, for as long as the spawner is active.
 * @param time - The time instance used to throttle batch spawning.
 * @param random - The random instance used to size and place bodies.
 */
export const createBodySpawnerEcsSystem = (
  time: Time,
  random: Random,
): EcsSystem<[BodySpawnerEcsComponent]> => ({
  query: [bodySpawnerId],
  update: (world, { components: [spawners] }) => {
    for (const spawner of spawners) {
      if (!spawner.isSpawning || time.timeInSeconds < spawner.nextSpawnTime) {
        continue;
      }

      spawner.nextSpawnTime = time.timeInSeconds + spawner.timeBetweenBatches;

      for (let i = 0; i < spawner.batchSize; i++) {
        spawnBody(world, spawner, random);
        spawner.spawnedCount += 1;
      }
    }
  },
});
