import {
  addMaskComponent,
  addPositionComponent,
  addRotationComponent,
  addSpriteComponent,
  Color,
  createPresentEcsSystem,
  createRenderEcsSystem,
  createTransformEcsSystem,
  MaskShape,
  Vector2,
} from '../../../src/index.js';
import type { CreateScene, SceneHandle } from '../../fixtures/scenes/scene.js';
import {
  createComputedTexture,
  createGoldenCamera,
  createGoldenSceneContext,
  createGoldenSceneHandle,
  Texel,
} from '../golden-scene.js';

const size = 72;

/** A 8 × 8 checkerboard, so a mask's edge shows against texture detail. */
function checkerTexel(x: number, y: number): Texel {
  return (x + y) % 2 === 0 ? [240, 120, 40, 255] : [60, 170, 220, 255];
}

/**
 * Sprites under each mask shape: a rect mask clipping an oversized child,
 * linear masks revealing part of a sprite from the left and from the
 * bottom, and radial masks, one on a rotated sprite.
 * @param container - The element to render the scene's canvas into.
 * @returns The scene's handle.
 */
export const createScene: CreateScene = (
  container: HTMLElement,
): SceneHandle => {
  const context = createGoldenSceneContext(container);
  const { world, renderContext } = context;

  createGoldenCamera(context, { clearColor: new Color(0.15, 0.15, 0.15) });

  const checker = createComputedTexture(renderContext, 8, 8, checkerTexel);

  const addMaskedSprite = (
    position: Vector2,
    shape: MaskShape,
    rotation = 0,
  ): void => {
    const entity = world.createEntity();

    addPositionComponent(world, entity, { local: position });
    addRotationComponent(world, entity, { local: rotation });
    addSpriteComponent(world, entity, {
      texture: checker,
      width: size,
      height: size,
    });
    addMaskComponent(world, entity, { width: size, height: size, shape });
  };

  // A rect mask on a parent clips its child, which is wider than the mask.
  const clip = world.createEntity();

  addPositionComponent(world, clip, { local: { x: -100, y: 55 } });
  addMaskComponent(world, clip, { width: size, height: size / 2 });

  const clippedChild = world.createEntity();

  addPositionComponent(world, clippedChild, { local: { x: 10, y: 0 } });
  world.setParent(clippedChild, clip);
  addSpriteComponent(world, clippedChild, {
    texture: checker,
    width: size * 1.5,
    height: size,
  });

  addMaskedSprite(
    { x: 0, y: 55 },
    { kind: 'linear', origin: 'left', amount: 0.6 },
  );
  addMaskedSprite(
    { x: 100, y: 55 },
    { kind: 'linear', origin: 'bottom', amount: 0.35 },
  );
  addMaskedSprite(
    { x: -60, y: -60 },
    {
      kind: 'radial',
      startAngle: Math.PI / 2,
      sweep: -Math.PI * 2,
      amount: 0.7,
    },
  );
  addMaskedSprite(
    { x: 60, y: -60 },
    { kind: 'radial', startAngle: 0, sweep: Math.PI, amount: 0.5 },
    Math.PI / 6,
  );

  world.addSystem(createTransformEcsSystem());
  world.addSystem(createRenderEcsSystem(renderContext));
  world.addSystem(createPresentEcsSystem(renderContext));

  return createGoldenSceneHandle(context);
};
