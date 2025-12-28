import type { Game } from '../game.js';
import { World } from '../world.js';

/**
 * Creates a new world with the specified name and registers it with the game.
 *
 * @param game - The game instance to register the world with.
 * @param name - The name of the world to create.
 * @returns The new ECS world instance.
 */
export function createWorld(game: Game, name?: string): World {
  const world = new World(name);
  game.registerWorld(world);

  return world;
}
