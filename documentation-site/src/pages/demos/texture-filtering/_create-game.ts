import {
  createCamera,
  createCameraEcsSystem,
  createRenderEcsSystem,
} from '@forge-game-engine/forge/rendering';
import { createGame, Game } from '@forge-game-engine/forge/utilities';
import { DEMO_VERTICAL_WORLD_UNITS } from '@site/src/utils/demo-camera';
import { createEntity } from './_create-entity';
import { createSprite } from './_create-sprite';

const renderLayers = {
  foreground: 1 << 0,
};

export const createTextureFilteringGame = async (): Promise<Game> => {
  const { game, world, renderContext, time } = createGame('demo-game');
  createCamera(world, { verticalWorldUnits: DEMO_VERTICAL_WORLD_UNITS });

  const pixelSprite = await createSprite(
    renderContext,
    renderLayers.foreground,
    true,
  );

  const rasterSprite = await createSprite(
    renderContext,
    renderLayers.foreground,
    false,
  );

  createEntity(world, pixelSprite, -200);
  createEntity(world, rasterSprite, 200);

  world.addSystem(createCameraEcsSystem(time));
  world.addSystem(createRenderEcsSystem(renderContext));

  return game;
};
