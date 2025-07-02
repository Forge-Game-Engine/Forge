import { Chain } from '../../utilities';
import type { Game } from '../game';
import { World } from '../world';

type WorldCreationResult = {
  world: World;
  game: Game;
};

/**
 * Creates a new world with the specified name and registers it with the game.
 *
 * @param name - The name of the world to create.
 * @param game - The game instance to register the world with.
 * @returns An object containing the created world, layer service, camera entity, inputs entity and render layers.
 */
export function createWorld(
  name: string,
  game: Game,
): Chain<WorldCreationResult> {
  const world = new World(name);
  game.registerWorld(world);

  return new Chain({ world, game });
}
