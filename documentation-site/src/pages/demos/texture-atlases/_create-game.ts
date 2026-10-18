import { createSpriteAnimationEcsSystem } from '@forge-game-engine/forge/animations';
import {
  createCamera,
  createCameraEcsSystem,
  createRenderEcsSystem,
} from '@forge-game-engine/forge/rendering';
import { createGame, Game } from '@forge-game-engine/forge/utilities';
import { createTransformEcsSystem } from '@forge-game-engine/forge/common';
import { DEMO_VERTICAL_WORLD_UNITS } from '@site/src/utils/demo-camera';
import { createIslandMap } from './_create-island-map';
import { createShips } from './_create-ships';

export const createTextureAtlasesGame = async (): Promise<Game> => {
  const { game, world, renderContext, time } = createGame('demo-game');

  createCamera(world, { verticalWorldUnits: DEMO_VERTICAL_WORLD_UNITS });

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
