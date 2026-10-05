import { createTransformEcsSystem } from '@forge-game-engine/forge/common';
import { Random } from '@forge-game-engine/forge/math';
import {
  createCamera,
  createPostProcessEcsSystem,
  createPresentEcsSystem,
  createRenderEcsSystem,
  createRenderTarget,
} from '@forge-game-engine/forge/rendering';
import { createGame, Game } from '@forge-game-engine/forge/utilities';
import { DEMO_VERTICAL_WORLD_UNITS } from '@site/src/utils/demo-camera';
import { addPostProcessing } from './_create-post-processing';
import { createScene } from './_create-scene';
import { createGlitchEcsSystem } from './_glitch.system';

const sceneLayer = 1 << 0;

export const createPostProcessingGame = async (): Promise<Game> => {
  const { game, world, renderContext, time } = createGame('demo-game');

  // Post-processing runs over a camera's render target, so this camera
  // draws off-screen and the present system draws the result to the canvas.
  const camera = createCamera(world, {
    isStatic: true,
    cullingMask: sceneLayer,
    verticalWorldUnits: DEMO_VERTICAL_WORLD_UNITS,
    renderTarget: createRenderTarget(
      renderContext.gl,
      renderContext.width,
      renderContext.height,
    ),
  });

  await createScene(world, renderContext, sceneLayer);
  addPostProcessing(world, renderContext, camera);

  world.addSystem(createGlitchEcsSystem(time, new Random()));
  world.addSystem(createTransformEcsSystem());
  world.addSystem(createRenderEcsSystem(renderContext));
  // After the render system, so the passes see this frame's image, and
  // before the present system, which draws their result.
  world.addSystem(createPostProcessEcsSystem(renderContext));
  world.addSystem(createPresentEcsSystem(renderContext));

  return game;
};
