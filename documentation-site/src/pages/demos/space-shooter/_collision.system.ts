import {
  PositionEcsComponent,
  positionId,
  Time,
} from '@forge-game-engine/forge/common';
import { EcsSystem } from '@forge-game-engine/forge/ecs';
import {
  ContactsEcsComponent,
  contactsId,
} from '@forge-game-engine/forge/physics';
import { AsteroidEcsComponent, asteroidId } from './_asteroid.component';
import { bulletId } from './_bullet.component';
import { ExplosionSpawner } from './_create-explosions';
import { PlayerId } from './_player.component';

/**
 * Creates an ECS system that checks what each asteroid is touching this
 * tick (its `ContactsEcsComponent`, filled by `createNarrowPhaseEcsSystem`)
 * for a bullet or the player, spawning an explosion and removing the
 * involved entities. Must run after `createNarrowPhaseEcsSystem`, so this
 * tick's contacts are available before this system checks them.
 * @param time - The time instance used to seed the spawned explosion's
 * animation start time.
 * @param explosionSpawner - Spawns an explosion effect at a world position.
 * @param onPlayerDeath - Called when the player is destroyed by an
 * asteroid.
 */
export const createAsteroidCollisionEcsSystem = (
  time: Time,
  explosionSpawner: ExplosionSpawner,
  onPlayerDeath: () => void,
): EcsSystem<
  [AsteroidEcsComponent, PositionEcsComponent, ContactsEcsComponent]
> => ({
  query: [asteroidId, positionId, contactsId],
  update: (
    world,
    { entities, components: [, positionComponents, contactsComponents] },
  ) => {
    for (let i = 0; i < entities.length; i++) {
      const asteroidEntity = entities[i];
      const positionComponent = positionComponents[i];

      for (const otherEntity of contactsComponents[i].touching) {
        // A bullet touching two asteroids is removed by the first one.
        if (!world.isAlive(otherEntity)) {
          continue;
        }

        if (world.getComponent(otherEntity, bulletId)) {
          explosionSpawner.spawn(
            world,
            positionComponent.local,
            time.timeInSeconds,
          );
          world.removeEntity(asteroidEntity);
          world.removeEntity(otherEntity);

          break;
        }

        if (world.getComponent(otherEntity, PlayerId)) {
          explosionSpawner.spawn(
            world,
            positionComponent.local,
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
