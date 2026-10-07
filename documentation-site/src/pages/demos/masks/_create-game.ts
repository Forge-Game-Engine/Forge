import { createTransformEcsSystem } from '@forge-game-engine/forge/common';
import {
  Color,
  createCamera,
  createCameraEcsSystem,
  createPresentEcsSystem,
  createRenderEcsSystem,
} from '@forge-game-engine/forge/rendering';
import { createGame, Game } from '@forge-game-engine/forge/utilities';
import { DEMO_VERTICAL_WORLD_UNITS } from '@site/src/utils/demo-camera';
import { createMaskedContent } from './_create-masked-content';
import { createMaskPulseEcsSystem } from './_mask-pulse.system';
import { createScrollEcsSystem } from './_scroll.system';

/**
 * Builds the masks demo: a list scrolling through a rect mask, a
 * nine-slice bar revealed by a linear mask, and an arc gauge revealed by a
 * radial mask.
 * @returns The created game.
 */
export const createMasksGame = async (): Promise<Game> => {
  const { game, world, renderContext, time } = createGame('demo-game');

  createCamera(world, {
    isStatic: true,
    clearColor: new Color(0.09, 0.11, 0.16),
    verticalWorldUnits: DEMO_VERTICAL_WORLD_UNITS,
  });

  await createMaskedContent(world, renderContext);

  world.addSystem(createCameraEcsSystem(time));
  world.addSystem(createScrollEcsSystem(time));
  world.addSystem(createMaskPulseEcsSystem(time));
  world.addSystem(createTransformEcsSystem());
  world.addSystem(createRenderEcsSystem(renderContext));
  world.addSystem(createPresentEcsSystem(renderContext));

  return game;
};
