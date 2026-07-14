import {
  addCamera,
  createCameraEcsSystem,
  createRenderEcsSystem,
} from '@forge-game-engine/forge/rendering';
import { createGame, Game } from '@forge-game-engine/forge/utilities';
import { createEasingRows } from './_create-easing-rows';
import { createEasingRowEcsSystem } from './_easing-row.system';

const renderLayers = {
  foreground: 1 << 0,
};

export const createEasingFunctionsGame = async (): Promise<Game> => {
  const { game, world, renderContext, time } = createGame('demo-game');

  addCamera(world, {
    isStatic: true,
    cullingMask: renderLayers.foreground,
  });

  await createEasingRows(world, renderContext, renderLayers.foreground);

  world.addSystem(createCameraEcsSystem(time));
  world.addSystem(createRenderEcsSystem(renderContext));
  world.addSystem(createEasingRowEcsSystem(time));

  return game;
};
