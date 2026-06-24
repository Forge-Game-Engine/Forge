import {
  addCamera,
  createCameraEcsSystem,
  createRenderEcsSystem,
  spriteId,
} from '@forge-game-engine/forge/rendering';
import { createGame, Game } from '@forge-game-engine/forge/utilities';
import {
  positionId,
  rotationId,
  scaleId,
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

  addCamera(world, {
    isStatic: true,
    layerMask: renderLayers.foreground,
  });

  const sprite = await createErosionSprite(
    renderContext,
    renderLayers.foreground,
  );

  const scale = displaySize / sprite.width;

  const entity = world.createEntity();

  world.addComponent(entity, positionId, {
    local: Vector2.zero,
    world: Vector2.zero,
  });

  world.addComponent(entity, rotationId, { local: 0, world: 0 });

  world.addComponent(entity, scaleId, {
    local: new Vector2(scale, scale),
    world: new Vector2(scale, scale),
  });

  world.addComponent(entity, spriteId, sprite);

  world.addTag(entity, erosionId);

  world.addSystem(createCameraEcsSystem(time));
  world.addSystem(createRenderEcsSystem(renderContext));
  world.addSystem(createErosionEcsSystem(time));

  return game;
};
