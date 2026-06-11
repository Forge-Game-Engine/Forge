import { EcsSystem } from '@forge-game-engine/forge/ecs';
import { PhysicsWorld } from '@forge-game-engine/forge/physics';
import { AsteroidEcsComponent, asteroidId } from './_asteroid.component';
import { bulletId } from './_bullet.component';
import { PlayerId } from './_player.component';

export const createAsteroidCollisionEcsSystem = (
  physicsWorld: PhysicsWorld,
): EcsSystem<[AsteroidEcsComponent]> => ({
  query: [asteroidId],
  run: (result, world) => {
    const asteroidEntity = result.entity;

    for (const { entityA, entityB } of physicsWorld.collisionStarts) {
      if (entityA !== asteroidEntity && entityB !== asteroidEntity) {
        continue;
      }

      const otherEntity = entityA === asteroidEntity ? entityB : entityA;

      if (world.getComponent(otherEntity, bulletId)) {
        world.removeEntity(asteroidEntity);
        world.removeEntity(otherEntity);

        return;
      }

      if (world.getComponent(otherEntity, PlayerId)) {
        world.removeEntity(otherEntity);

        return;
      }
    }
  },
});
