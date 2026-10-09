import {
  addPositionComponent,
  addSpriteComponent,
  addTerrainMeshComponent,
  buildTerrainCurve,
  Color,
  createPresentEcsSystem,
  createRenderEcsSystem,
  createTerrainMesh,
  createTerrainRenderEcsSystem,
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

/** A 16 × 16 tile of diagonal grass stripes. */
function grassTexel(x: number, y: number): Texel {
  return (x + y) % 8 < 4 ? [90, 170, 60, 255] : [60, 130, 40, 255];
}

/** A 16 × 16 tile of soil with a darker stone every quarter. */
function soilTexel(x: number, y: number): Texel {
  const isStone = x % 8 < 3 && y % 8 < 3;

  return isStone ? [90, 60, 40, 255] : [150, 105, 70, 255];
}

/**
 * A terrain mesh along a smooth curve through fixed control points, with a
 * tiled border layer blending into a tiled fill layer, and a sprite drawn
 * over it.
 * @param container - The element to render the scene's canvas into.
 * @returns The scene's handle.
 */
export const createScene: CreateScene = (
  container: HTMLElement,
): SceneHandle => {
  const context = createGoldenSceneContext(container);
  const { world, renderContext } = context;

  createGoldenCamera(context, { clearColor: new Color(0.55, 0.75, 0.95) });

  const curvePoints = buildTerrainCurve(
    [
      { x: -200, y: 10 },
      { x: -120, y: 40 },
      { x: -40, y: -10 },
      { x: 40, y: 0 },
      { x: 120, y: 50 },
      { x: 200, y: 20 },
    ],
    12,
  );

  const terrain = world.createEntity();

  // The mesh is built in world space at `position`, so the entity needs no
  // transform of its own.
  addTerrainMeshComponent(world, terrain, {
    mesh: createTerrainMesh(renderContext, {
      curvePoints,
      depth: 120,
      position: { x: 0, y: -60 },
      angle: 0,
      border: {
        texture: createComputedTexture(renderContext, 16, 16, grassTexel, {
          wrap: 'repeat',
        }),
        tileSize: { x: 32, y: 32 },
        tint: Color.white,
      },
      fill: {
        texture: createComputedTexture(renderContext, 16, 16, soilTexel, {
          wrap: 'repeat',
        }),
        tileSize: { x: 48, y: 48 },
        tint: Color.white,
      },
      borderWidth: 18,
      borderBlend: 8,
    }),
  });

  const marker = world.createEntity();

  addPositionComponent(world, marker, { local: { x: 40, y: -40 } });
  addSpriteComponent(world, marker, {
    texture: renderContext.whiteTexture,
    width: 24,
    height: 24,
    tintColor: new Color(0.9, 0.2, 0.3),
  });

  world.addSystem(createTransformEcsSystem());
  world.addSystem(createTerrainRenderEcsSystem(renderContext));
  world.addSystem(createRenderEcsSystem(renderContext));
  world.addSystem(createPresentEcsSystem(renderContext));

  return createGoldenSceneHandle(context);
};
