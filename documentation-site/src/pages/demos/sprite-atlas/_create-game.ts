import { createSpriteAnimationEcsSystem } from '@forge-game-engine/forge/animations';
import { createTransformEcsSystem } from '@forge-game-engine/forge/common';
import {
  Color,
  createCamera,
  createCameraEcsSystem,
  createPresentEcsSystem,
  createRenderEcsSystem,
} from '@forge-game-engine/forge/rendering';
import { createUiCanvas, registerUiSystems } from '@forge-game-engine/forge/ui';
import { createGame, Game } from '@forge-game-engine/forge/utilities';
import { DEMO_VERTICAL_WORLD_UNITS } from '@site/src/utils/demo-camera';
import { createBurningShip } from './_create-burning-ship';
import { createInventoryPanel } from './_create-panel';
import { loadAtlas } from './_load-atlas';
import { spawnProps } from './_spawn-props';

const renderLayers = {
  world: 1 << 0,
  ui: 1 << 1,
};

const seaColor = new Color(0.36, 0.73, 0.89, 1);

export const createSpriteAtlasGame = async (): Promise<Game> => {
  const { game, world, renderContext, time } = createGame('demo-game');

  createCamera(world, {
    isStatic: true,
    cullingMask: renderLayers.world,
    verticalWorldUnits: DEMO_VERTICAL_WORLD_UNITS,
    clearColor: seaColor,
  });

  const atlas = await loadAtlas(renderContext);

  registerUiSystems(world, renderContext, time);

  const canvas = createUiCanvas(world, renderContext, {
    cullingMask: renderLayers.ui,
  });

  // Every sprite below draws a region of the same atlas texture, so the
  // world camera draws the whole scene in one batch, and the UI camera the
  // whole panel in another.
  spawnProps(world, atlas, renderLayers.world);
  const clips = createBurningShip(world, atlas, renderLayers.world);
  createInventoryPanel(world, canvas, atlas, renderLayers.ui);

  world.addSystem(createCameraEcsSystem(time));
  world.addSystem(createSpriteAnimationEcsSystem(time, clips));
  world.addSystem(createTransformEcsSystem(time));
  world.addSystem(createRenderEcsSystem(renderContext));
  world.addSystem(createPresentEcsSystem(renderContext));

  return game;
};
