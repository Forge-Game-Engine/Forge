import {
  createCamera,
  createCameraEcsSystem,
  createRenderEcsSystem,
} from '@forge-game-engine/forge/rendering';
import { createGame, Game } from '@forge-game-engine/forge/utilities';
import { DEMO_VERTICAL_WORLD_UNITS } from '@site/src/utils/demo-camera';
import { createEntity } from './_create-entity';
import { createSprite } from './_create-sprite';
import { createDemoEcsSystem } from './_demo.system';

const renderLayers = {
  foreground: 1 << 0,
};

export const createEcsGame = async (): Promise<Game> => {
  const { game, world, renderContext, time } = createGame('demo-game');
  createCamera(world, { verticalWorldUnits: DEMO_VERTICAL_WORLD_UNITS });

  const sprite = await createSprite(renderContext, renderLayers.foreground);

  createEntity(world, sprite);

  world.addSystem(createCameraEcsSystem(time));
  world.addSystem(createRenderEcsSystem(renderContext));
  world.addSystem(createDemoEcsSystem(time));

  return game;
};
