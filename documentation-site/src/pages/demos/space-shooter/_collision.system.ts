import {
  PositionEcsComponent,
  positionId,
  Time,
} from '@forge-game-engine/forge/common';
import { EcsSystem } from '@forge-game-engine/forge/ecs';
import { CollisionManifold } from '@forge-game-engine/forge/physics';
import { AsteroidEcsComponent, asteroidId } from './_asteroid.component';
import { bulletId } from './_bullet.component';
import { ExplosionSpawner } from './_create-explosions';
import { PlayerId } from './_player.component';

/**
 * Creates an ECS system that scans `collisionManifolds` (populated by
 * `createNarrowPhaseEcsSystem`) each tick for any asteroid touching a
 * bullet or the player, spawning an explosion and removing the involved
 * entities. Must run after `createNarrowPhaseEcsSystem`, so this tick's
 * collisions are available before this system checks them.
 * @param collisionManifolds - The narrow-phase system's output: this tick's
 * confirmed collisions.
 * @param time - The time instance used to seed the spawned explosion's
 * animation start time.
 * @param explosionSpawner - Spawns an explosion effect at a world position.
 * @param onPlayerDeath - Called when the player is destroyed by an
 * asteroid.
 */
export const createAsteroidCollisionEcsSystem = (
  collisionManifolds: CollisionManifold[],
  time: Time,
  explosionSpawner: ExplosionSpawner,
  onPlayerDeath: () => void,
): EcsSystem<[AsteroidEcsComponent, PositionEcsComponent]> => ({
  query: [asteroidId, positionId],
  update: (world, { entities, components: [, positionComponents] }) => {
    for (let i = 0; i < entities.length; i++) {
      const asteroidEntity = entities[i];
      const positionComponent = positionComponents[i];

      for (const { entityA, entityB } of collisionManifolds) {
        if (entityA !== asteroidEntity && entityB !== asteroidEntity) {
          continue;
        }

        const otherEntity = entityA === asteroidEntity ? entityB : entityA;

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
