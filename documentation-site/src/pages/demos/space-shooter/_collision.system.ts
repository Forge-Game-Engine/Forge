import {
  PositionEcsComponent,
  positionId,
  Time,
} from '@forge-game-engine/forge/common';
import { EcsSystem } from '@forge-game-engine/forge/ecs';
import { PhysicsWorld } from '@forge-game-engine/forge/physics';
import { AsteroidEcsComponent, asteroidId } from './_asteroid.component';
import { bulletId } from './_bullet.component';
import { ExplosionSpawner } from './_create-explosions';
import { PlayerId } from './_player.component';

export const createAsteroidCollisionEcsSystem = (
  physicsWorld: PhysicsWorld,
  time: Time,
  explosionSpawner: ExplosionSpawner,
  onPlayerDeath: () => void,
): EcsSystem<[AsteroidEcsComponent, PositionEcsComponent]> => ({
  query: [asteroidId, positionId],
  update: (world, { entities, components: [, positionComponents] }) => {
    for (let i = 0; i < entities.length; i++) {
      const asteroidEntity = entities[i];
      const positionComponent = positionComponents[i];

      for (const { bodyA, bodyB } of physicsWorld.collisionStarts) {
        const entityA = bodyA.userData;
        const entityB = bodyB.userData;

        if (entityA !== asteroidEntity && entityB !== asteroidEntity) {
          continue;
        }

        const otherEntity = entityA === asteroidEntity ? entityB : entityA;

        if (typeof otherEntity !== 'number') {
          continue;
        }

        if (world.getComponent(otherEntity, bulletId)) {
          explosionSpawner.spawn(
            world,
            positionComponent.world,
            time.timeInSeconds,
          );
          world.removeEntity(asteroidEntity);
          world.removeEntity(otherEntity);

          // Equivalent to the old per-entity `run`'s `return`: stop checking
          // further collisions for this asteroid. Breaking the inner loop is
          // enough since it's the last statement in the outer loop body, so
          // control falls through to the next entity exactly as before.
          break;
        }

        if (world.getComponent(otherEntity, PlayerId)) {
          explosionSpawner.spawn(
            world,
            positionComponent.world,
            time.timeInSeconds,
          );
          world.removeEntity(otherEntity);
          onPlayerDeath();

          break;
        }
      }
    }
  },
});
