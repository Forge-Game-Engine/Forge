import {
  createCamera,
  createRenderEcsSystem,
} from '@forge-game-engine/forge/rendering';
import { createGame, Game } from '@forge-game-engine/forge/utilities';
import {
  AnimationClip,
  createSpriteAnimationEcsSystem,
} from '@forge-game-engine/forge/animations';
import { AssetRegistry } from '@forge-game-engine/forge/asset-loading';
import { DEMO_VERTICAL_WORLD_UNITS } from '@site/src/utils/demo-camera';
import { createInputs } from './_create-inputs';
import { createPlayer } from './_create-player';
import { createMovementEcsSystem } from './_movement.system';

const renderLayers = {
  foreground: 1 << 0,
};

export const createSpriteAnimationGame = async (): Promise<Game> => {
  const { game, world, renderContext, time } = createGame('demo-game');

  createCamera(world, {
    isStatic: true,
    verticalWorldUnits: DEMO_VERTICAL_WORLD_UNITS,
  });

  const { moveInput } = createInputs(world, time);

  const animationRegistry = new AssetRegistry<AnimationClip>();

  const player = await createPlayer(
    world,
    renderContext,
    renderLayers.foreground,
    animationRegistry,
  );

  world.addSystem(
    createMovementEcsSystem(
      moveInput,
      time,
      player.idleAnimationHandle,
      player.runAnimationHandle,
    ),
  );
  world.addSystem(createSpriteAnimationEcsSystem(time, animationRegistry));
  world.addSystem(createRenderEcsSystem(renderContext));

  return game;
};
