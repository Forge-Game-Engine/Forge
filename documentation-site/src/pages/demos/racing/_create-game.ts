import {
  addCamera,
  createCameraEcsSystem,
  createRenderEcsSystem,
} from '@forge-game-engine/forge/rendering';
import { createGame, Game } from '@forge-game-engine/forge/utilities';
import { createInputs } from './_create-inputs';
import { createScene } from './_create-scene';
import { createPlayer } from './_create-player';
import { createMovementEcsSystem } from './_movement.system';

const renderLayers = {
  foreground: 1 << 0,
};

export const createRacingGame = async (): Promise<Game> => {
  const { game, world, renderContext, time } = createGame('demo-game');

  addCamera(world, {
    isStatic: true,
    layerMask: renderLayers.foreground,
  });

  const moveInput = createInputs(world, time);

  await createScene(world, renderContext, renderLayers.foreground);
  await createPlayer(renderContext, world, renderLayers.foreground);

  world.addSystem(createCameraEcsSystem(time));
  world.addSystem(createRenderEcsSystem(renderContext));
  world.addSystem(createMovementEcsSystem(moveInput, time));

  return game;
};
