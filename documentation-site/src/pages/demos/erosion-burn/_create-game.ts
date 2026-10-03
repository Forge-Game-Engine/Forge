import {
  addSpriteComponent,
  createCamera,
  createCameraEcsSystem,
  createRenderEcsSystem,
} from '@forge-game-engine/forge/rendering';
import { createGame, Game } from '@forge-game-engine/forge/utilities';
import {
  addPositionComponent,
  addRotationComponent,
  addScaleComponent,
  createTransformEcsSystem,
} from '@forge-game-engine/forge/common';

import { DEMO_VERTICAL_WORLD_UNITS } from '@site/src/utils/demo-camera';
import { createErosionSprite } from './_create-sprite';
import { erosionId } from './_erosion.component';
import { createErosionEcsSystem } from './_erosion.system';

const renderLayers = {
  foreground: 1 << 0,
};

const displaySize = 480;

export const createErosionBurnGame = async (): Promise<Game> => {
  const { game, world, renderContext, time } = createGame('demo-game');

  createCamera(world, {
    isStatic: true,
    cullingMask: renderLayers.foreground,
    verticalWorldUnits: DEMO_VERTICAL_WORLD_UNITS,
  });

  const sprite = await createErosionSprite(
    renderContext,
    renderLayers.foreground,
  );

  const scale = displaySize / sprite.width;

  const entity = world.createEntity();

  addPositionComponent(world, entity);

  addRotationComponent(world, entity);

  addScaleComponent(world, entity, {
    local: { x: scale, y: scale },
  });

  addSpriteComponent(world, entity, sprite);

  world.addTag(entity, erosionId);

  world.addSystem(createCameraEcsSystem(time));
  world.addSystem(createErosionEcsSystem(time));
  // Derives the sprite's `world` pose (including its scale) from its
  // `local` pose for the render system to draw.
  world.addSystem(createTransformEcsSystem());
  world.addSystem(createRenderEcsSystem(renderContext));

  return game;
};
