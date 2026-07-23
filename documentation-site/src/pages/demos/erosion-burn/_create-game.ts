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
} from '@forge-game-engine/forge/common';
import { Vector2 } from '@forge-game-engine/forge/math';
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
    local: new Vector2(scale, scale),
    world: new Vector2(scale, scale),
  });

  addSpriteComponent(world, entity, sprite);

  world.addTag(entity, erosionId);

  world.addSystem(createCameraEcsSystem(time));
  world.addSystem(createRenderEcsSystem(renderContext));
  world.addSystem(createErosionEcsSystem(time));

  return game;
};
