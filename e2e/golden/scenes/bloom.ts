import {
  addBloomComponent,
  addPositionComponent,
  addSpriteComponent,
  addToneMappingComponent,
  Color,
  createBloomEcsSystem,
  createPresentEcsSystem,
  createRenderEcsSystem,
  createRenderTarget,
  createToneMapEcsSystem,
  createTransformEcsSystem,
  RENDER_TARGET_FORMAT,
  SpriteEcsComponent,
  SpriteRequiredOptions,
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

/** A 16 × 16 emissive map: a bright cross on black. */
function crossTexel(x: number, y: number): Texel {
  const isCross = (x >= 6 && x < 10) || (y >= 6 && y < 10);
  const value = isCross ? 255 : 0;

  return [value, value, value, 255];
}

/**
 * HDR sprites blooming over a dim background on an HDR camera with ACES
 * tone mapping: one tinted above white, one at white (under the threshold
 * after exposure), one lit by an emissive map brighter than `1`, and a thin
 * bright line, whose glow is wider than the line itself.
 * @param container - The element to render the scene's canvas into.
 * @returns The scene's handle.
 */
export const createScene: CreateScene = (
  container: HTMLElement,
): SceneHandle => {
  const context = createGoldenSceneContext(container);
  const { world, renderContext } = context;

  const camera = createGoldenCamera(context, {
    clearColor: new Color(0.05, 0.06, 0.1),
    renderTarget: createRenderTarget(
      renderContext,
      'canvas',
      RENDER_TARGET_FORMAT.hdr,
    ),
  });

  addBloomComponent(world, camera, { threshold: 1, passes: 4, intensity: 1 });
  addToneMappingComponent(world, camera);

  const addSprite = (
    position: Vector2,
    sprite: SpriteRequiredOptions & Partial<SpriteEcsComponent>,
  ): void => {
    const entity = world.createEntity();

    addPositionComponent(world, entity, { local: position });
    addSpriteComponent(world, entity, sprite);
  };

  const square = {
    texture: renderContext.whiteTexture,
    width: 40,
    height: 40,
  };

  addSprite({ x: -100, y: 40 }, { ...square, tintColor: new Color(4, 1, 0.5) });
  addSprite({ x: 0, y: 40 }, { ...square, tintColor: Color.white });
  addSprite(
    { x: 100, y: 40 },
    {
      ...square,
      tintColor: new Color(0.2, 0.2, 0.25),
      emissive: {
        texture: createComputedTexture(renderContext, 16, 16, crossTexel),
        color: new Color(0.5, 2, 3),
      },
    },
  );
  addSprite(
    { x: 0, y: -60 },
    {
      texture: renderContext.whiteTexture,
      width: 220,
      height: 3,
      tintColor: new Color(3, 3, 3),
    },
  );

  world.addSystem(createTransformEcsSystem());
  world.addSystem(createRenderEcsSystem(renderContext));
  world.addSystem(createBloomEcsSystem(renderContext));
  world.addSystem(createToneMapEcsSystem(renderContext));
  world.addSystem(createPresentEcsSystem(renderContext));

  return createGoldenSceneHandle(context);
};
