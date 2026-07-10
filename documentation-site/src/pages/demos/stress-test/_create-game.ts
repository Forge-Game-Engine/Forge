import { Random } from '@forge-game-engine/forge/math';
import {
  addCamera,
  createCameraEcsSystem,
  createRenderEcsSystem,
} from '@forge-game-engine/forge/rendering';
import { createGame, Game } from '@forge-game-engine/forge/utilities';
import { createSpriteSpawner } from './_create-sprite-spawner';
import { createFpsMonitorEcsSystem } from './_fps-monitor.system';
import { createSpriteSpawnerEcsSystem } from './_sprite-spawner.system';

const renderLayers = {
  foreground: 1 << 0,
};

export const createStressTestGame = async (): Promise<Game> => {
  const { game, world, renderContext, time } = createGame('demo-game');

  addCamera(world, {
    isStatic: true,
    cullingMask: renderLayers.foreground,
  });

  await createSpriteSpawner(world, renderContext, renderLayers.foreground);

  const random = new Random();

  world.addSystem(createCameraEcsSystem(time));
  world.addSystem(createRenderEcsSystem(renderContext));
  world.addSystem(createSpriteSpawnerEcsSystem(time, random));
  world.addSystem(createFpsMonitorEcsSystem(time));

  return game;
};
