import { EcsSystem } from '@forge-game-engine/forge/ecs';
import { TriggerAction } from '@forge-game-engine/forge/input';
import { GameOverEcsComponent, gameOverId } from './_game-over.component';
import { asteroidId } from './_asteroid.component';
import { bulletId } from './_bullet.component';

export const createGameOverEcsSystem = (
  restartInput: TriggerAction,
  respawnPlayer: () => void,
): EcsSystem<[GameOverEcsComponent]> => ({
  query: [gameOverId],
  run: (result, world) => {
    const [gameOverComponent] = result.components;

    if (gameOverComponent.isGameOver && restartInput.isTriggered) {
      gameOverComponent.isGameOver = false;

      const entitiesToRemove: number[] = [];

      world.queryEntities([asteroidId], entitiesToRemove);

      for (const entity of entitiesToRemove) {
        world.removeEntity(entity);
      }

      world.queryEntities([bulletId], entitiesToRemove);

      for (const entity of entitiesToRemove) {
        world.removeEntity(entity);
      }

      respawnPlayer();
    }

    // Read after the restart branch (rather than at the top of `run`), so
    // the message reflects this frame's *resolved* state instead of
    // flashing visible for one frame on the exact tick a restart is
    // processed.
    gameOverComponent.messageElement.style.display =
      gameOverComponent.isGameOver ? 'flex' : 'none';
  },
  cleanupEntities: (result) => {
    const [gameOverComponent] = result.components;

    gameOverComponent.messageElement.remove();
  },
});
