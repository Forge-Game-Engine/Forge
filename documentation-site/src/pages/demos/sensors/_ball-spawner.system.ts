import {
  addPositionComponent,
  addRotationComponent,
  Time,
} from '@forge-game-engine/forge/common';
import { EcsSystem } from '@forge-game-engine/forge/ecs';
import { Random } from '@forge-game-engine/forge/math';
import {
  addColliderComponent,
  addGravityComponent,
  addRigidBodyComponent,
  CircleCollider,
} from '@forge-game-engine/forge/physics';
import {
  addSpriteComponent,
  Color,
  SpriteEcsComponent,
} from '@forge-game-engine/forge/rendering';
import { ballCategory } from './_create-scene';

const spawnInterval = 0.2;
const minRadius = 8;
const maxRadius = 16;

/**
 * Creates an ECS system that drops a ball from just above the top of the
 * scene every `spawnInterval` seconds. Balls are ordinary dynamic bodies:
 * they collide with the walls, the ramps and each other, and pass through
 * the sensor zones.
 * @param time - The game's time, for spawn timing.
 * @param ballSprite - The sprite every ball is drawn with.
 * @param spawnY - The world y the balls are dropped from.
 * @param spawnHalfWidth - Balls spawn at a random x within this distance
 * of the center.
 */
export const createBallSpawnerEcsSystem = (
  time: Time,
  ballSprite: SpriteEcsComponent,
  spawnY: number,
  spawnHalfWidth: number,
): EcsSystem<[]> => {
  const random = new Random('sensors');
  let sinceLastSpawn = 0;

  return {
    query: [],
    update: (world) => {
      sinceLastSpawn += time.deltaTimeInSeconds;

      if (sinceLastSpawn < spawnInterval) {
        return;
      }

      sinceLastSpawn = 0;

      const radius = random.randomFloat(minRadius, maxRadius);
      const collider = new CircleCollider(radius);
      const entity = world.createEntity();

      addPositionComponent(world, entity, {
        local: {
          x: random.randomFloat(-spawnHalfWidth, spawnHalfWidth),
          y: spawnY,
        },
      });
      addRotationComponent(world, entity);
      addSpriteComponent(world, entity, {
        ...ballSprite,
        width: radius * 2,
        height: radius * 2,
        tintColor: Color.white,
      });
      addColliderComponent(world, entity, {
        collider,
        restitution: 0.5,
        category: ballCategory,
      });
      addRigidBodyComponent(world, entity, {
        mass: collider.mass,
        momentOfInertia: collider.momentOfInertia,
      });
      addGravityComponent(world, entity, { amount: { x: 0, y: -600 } });
    },
  };
};
