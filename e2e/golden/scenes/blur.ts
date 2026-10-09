import {
  addGaussianBlurComponent,
  addPositionComponent,
  addRotationComponent,
  addSpriteComponent,
  Color,
  createGaussianBlurEcsSystem,
  createPresentEcsSystem,
  createRenderEcsSystem,
  createRenderTarget,
  createTransformEcsSystem,
} from '../../../src/index.js';
import type { CreateScene, SceneHandle } from '../../fixtures/scenes/scene.js';
import {
  createComputedTexture,
  createGoldenCamera,
  createGoldenSceneContext,
  createGoldenSceneHandle,
  Texel,
} from '../golden-scene.js';

/** A 4 × 4 checkerboard, blurred towards grey. */
function checkerTexel(x: number, y: number): Texel {
  return (x + y) % 2 === 0 ? [255, 255, 255, 255] : [20, 20, 20, 255];
}

/**
 * A camera with a Gaussian blur over a checkerboard, a rotated colored
 * square and a thin line, so the blur's radius and its falloff on hard
 * edges, fine detail and color all show.
 * @param container - The element to render the scene's canvas into.
 * @returns The scene's handle.
 */
export const createScene: CreateScene = (
  container: HTMLElement,
): SceneHandle => {
  const context = createGoldenSceneContext(container);
  const { world, renderContext } = context;

  const camera = createGoldenCamera(context, {
    clearColor: new Color(0.2, 0.4, 0.3),
    renderTarget: createRenderTarget(renderContext, 'canvas'),
  });

  addGaussianBlurComponent(world, camera, { passes: 2 });

  const checker = world.createEntity();

  addPositionComponent(world, checker, { local: { x: -80, y: 30 } });
  addSpriteComponent(world, checker, {
    texture: createComputedTexture(renderContext, 4, 4, checkerTexel),
    width: 96,
    height: 96,
  });

  const square = world.createEntity();

  addPositionComponent(world, square, { local: { x: 70, y: 30 } });
  addRotationComponent(world, square, { local: Math.PI / 5 });
  addSpriteComponent(world, square, {
    texture: renderContext.whiteTexture,
    width: 64,
    height: 64,
    tintColor: new Color(1, 0.3, 0.6),
  });

  const line = world.createEntity();

  addPositionComponent(world, line, { local: { x: 0, y: -80 } });
  addSpriteComponent(world, line, {
    texture: renderContext.whiteTexture,
    width: 240,
    height: 2,
    tintColor: new Color(1, 1, 0.4),
  });

  world.addSystem(createTransformEcsSystem());
  world.addSystem(createRenderEcsSystem(renderContext));
  world.addSystem(createGaussianBlurEcsSystem(renderContext));
  world.addSystem(createPresentEcsSystem(renderContext));

  return createGoldenSceneHandle(context);
};
