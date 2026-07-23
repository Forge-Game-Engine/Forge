import {
  createCamera,
  createCameraEcsSystem,
  createRenderEcsSystem,
} from '@forge-game-engine/forge/rendering';
import { createGame, Game } from '@forge-game-engine/forge/utilities';
import { createPanels } from './_create-panels';
import { createPanelEcsSystem } from './_panel.system';

const renderLayers = {
  foreground: 1 << 0,
};

export const createNineSliceGame = async (): Promise<Game> => {
  const { game, world, renderContext, time } = createGame('demo-game');

  createCamera(world, {
    isStatic: true,
    cullingMask: renderLayers.foreground,
  });

  await createPanels(world, renderContext, renderLayers.foreground);

  world.addSystem(createCameraEcsSystem(time));
  world.addSystem(createRenderEcsSystem(renderContext));
  world.addSystem(createPanelEcsSystem(time));

  return game;
};
