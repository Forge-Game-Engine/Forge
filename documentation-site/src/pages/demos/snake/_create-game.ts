import { Random } from '@forge-game-engine/forge/math';
import {
  addCamera,
  createCameraEcsSystem,
  createRenderEcsSystem,
} from '@forge-game-engine/forge/rendering';
import { createGame, Game } from '@forge-game-engine/forge/utilities';
import { createSnake } from './_create-snake';
import { SnakeGameController } from './_snake-controller';
import { createSnakeMovementEcsSystem } from './_snake-movement.system';
import { createSnakeRenderSyncEcsSystem } from './_snake-render-sync.system';
import { createSnakeTurnEcsSystem } from './_snake-turn.system';

/**
 * Creates the snake demo game: a fixed, centered camera looking at a grid
 * board, with the snake driven by three single-purpose systems — turning,
 * movement/simulation, and syncing that state to the rendered sprites —
 * and its direction controlled through `controller` by the demo page's
 * HTML direction buttons.
 *
 * Systems are registered in the order they need to run this tick: turning
 * before movement (so a queued turn affects the move that follows it),
 * movement before the render sync (so a move or collision this tick is
 * reflected immediately rather than a frame late), and the render sync
 * before the camera/render systems that actually draw the result.
 * @param controller - The controller the demo's React UI uses to send turns and read game state.
 */
export const createSnakeGame = async (
  controller: SnakeGameController,
): Promise<Game> => {
  const { game, world, renderContext, time } = createGame('demo-game');
  const random = new Random();

  addCamera(world, { isStatic: true });

  const entitySprite = await createSnake(world, renderContext, random);

  world.addSystem(createSnakeTurnEcsSystem(time, controller));
  world.addSystem(
    createSnakeMovementEcsSystem(
      time,
      random,
      renderContext,
      controller,
      entitySprite,
    ),
  );
  world.addSystem(createSnakeRenderSyncEcsSystem());
  world.addSystem(createCameraEcsSystem(time));
  world.addSystem(createRenderEcsSystem(renderContext));

  return game;
};
