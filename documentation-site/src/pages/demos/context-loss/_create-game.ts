import {
  createCamera,
  createCameraEcsSystem,
  createRenderEcsSystem,
} from '@forge-game-engine/forge/rendering';
import { createGame, Game } from '@forge-game-engine/forge/utilities';
import { createTransformEcsSystem } from '@forge-game-engine/forge/common';
import { DEMO_VERTICAL_WORLD_UNITS } from '@site/src/utils/demo-camera';
import { createPlanet } from './_create-planet';
import { loseContextOnClick } from './_lose-context-on-click';
import { createSpinEcsSystem } from './_spin.system';

export const createContextLossGame = async (): Promise<Game> => {
  const { game, world, renderContext, time } = createGame('demo-game');

  createCamera(world, { verticalWorldUnits: DEMO_VERTICAL_WORLD_UNITS });
  await createPlanet(world, renderContext);
  loseContextOnClick(renderContext);

  world.addSystem(createCameraEcsSystem(time));
  world.addSystem(createSpinEcsSystem(time));
  world.addSystem(createTransformEcsSystem());
  world.addSystem(createRenderEcsSystem(renderContext));

  return game;
};
