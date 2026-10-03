import {
  createCamera,
  createCameraEcsSystem,
  createRenderEcsSystem,
} from '@forge-game-engine/forge/rendering';
import { createGame, Game } from '@forge-game-engine/forge/utilities';
import { createTransformEcsSystem } from '@forge-game-engine/forge/common';
import { DEMO_VERTICAL_WORLD_UNITS } from '@site/src/utils/demo-camera';
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
    verticalWorldUnits: DEMO_VERTICAL_WORLD_UNITS,
  });

  await createPanels(world, renderContext, renderLayers.foreground);

  world.addSystem(createCameraEcsSystem(time));
  world.addSystem(createPanelEcsSystem(time));
  // After the panel system spins each panel's `local` rotation, so the
  // render system draws this frame's `world` rotation.
  world.addSystem(createTransformEcsSystem());
  world.addSystem(createRenderEcsSystem(renderContext));

  return game;
};
