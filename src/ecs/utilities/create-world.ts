import type { Game } from '../game';
import { World } from '../world';

/**
 * Creates a new world with the specified name and registers it with the game.
 *
 * @param name - The name of the world to create.
 * @param game - The game instance to register the world with.
 * @returns The new ECS world instance.
 */
export function createWorld(name: string, game: Game) {
  const world = new World(name);
  game.registerWorld(world);

  return world;
}
