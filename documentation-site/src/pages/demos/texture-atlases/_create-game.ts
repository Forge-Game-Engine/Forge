import { createSpriteAnimationEcsSystem } from '@forge-game-engine/forge/animations';
import {
  createCamera,
  createCameraEcsSystem,
  createRenderEcsSystem,
} from '@forge-game-engine/forge/rendering';
import { createGame, Game } from '@forge-game-engine/forge/utilities';
import { createTransformEcsSystem } from '@forge-game-engine/forge/common';
import { createIslandMap } from './_create-island-map';
import { createShips } from './_create-ships';

export const createTextureAtlasesGame = async (): Promise<Game> => {
  const { game, world, renderContext, time } = createGame('demo-game');

  // The camera shows its default 10 world units vertically, and both sheets
  // draw 64 texels per world unit, so a tile is one world unit square.
  createCamera(world);

  // Sprites draw in the order their entities were created, so the map's
  // tiles (one atlas) draw in one batch and the ships (another) in a second.
  await createIslandMap(world, renderContext);
  const shipClips = await createShips(world, renderContext);

  world.addSystem(createCameraEcsSystem(time));
  world.addSystem(createSpriteAnimationEcsSystem(time, shipClips));
  world.addSystem(createTransformEcsSystem());
  world.addSystem(createRenderEcsSystem(renderContext));

  return game;
};
