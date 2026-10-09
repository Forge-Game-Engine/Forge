import { EcsSystem } from '@forge-game-engine/forge/ecs';
import { TriggerAction } from '@forge-game-engine/forge/input';
import { GameOverEcsComponent, gameOverId } from './_game-over.component';
import { AsteroidEcsComponent, asteroidId } from './_asteroid.component';
import { BulletEcsComponent, bulletId } from './_bullet.component';

export const createGameOverEcsSystem = (
  restartInput: TriggerAction,
  respawnPlayer: () => void,
): EcsSystem<
  [GameOverEcsComponent],
  { asteroids: [AsteroidEcsComponent]; bullets: [BulletEcsComponent] }
> => ({
  query: [gameOverId],
  queries: {
    asteroids: { query: [asteroidId] },
    bullets: { query: [bulletId] },
  },
  update: (
    world,
    { components: [gameOverComponents] },
    { asteroids, bullets },
  ) => {
    for (const gameOverComponent of gameOverComponents) {
      if (gameOverComponent.isGameOver && restartInput.isTriggered) {
        gameOverComponent.isGameOver = false;

        for (const entity of asteroids.entities) {
          world.removeEntity(entity);
        }

        for (const entity of bullets.entities) {
          world.removeEntity(entity);
        }

        respawnPlayer();
      }

      // Read after the restart branch (rather than at the top of the loop),
      // so the message reflects this frame's *resolved* state instead of
      // flashing visible for one frame on the exact tick a restart is
      // processed.
      gameOverComponent.messageElement.style.display =
        gameOverComponent.isGameOver ? 'flex' : 'none';
    }
  },
  cleanup: (world) => {
    const {
      components: [gameOverComponents],
    } = world.query<[GameOverEcsComponent]>([gameOverId]);

    for (const gameOverComponent of gameOverComponents) {
      gameOverComponent.messageElement.remove();
    }
  },
});
