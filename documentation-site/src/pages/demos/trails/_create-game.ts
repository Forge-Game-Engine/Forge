import {
  addPositionComponent,
  createTransformEcsSystem,
} from '@forge-game-engine/forge/common';
import {
  addBloomComponent,
  addSpriteComponent,
  addToneMappingComponent,
  createBloomEcsSystem,
  createCamera,
  createImageSprite,
  createPresentEcsSystem,
  createRenderEcsSystem,
  createRenderTarget,
  createToneMapEcsSystem,
  createTrailEcsSystem,
  RENDER_TARGET_FORMAT,
} from '@forge-game-engine/forge/rendering';
import { createGame, Game } from '@forge-game-engine/forge/utilities';
import { DEMO_VERTICAL_WORLD_UNITS } from '@site/src/utils/demo-camera';
import { getAssetUrl } from '@site/src/utils/get-asset-url';
import { createTrails, DemoTrails } from './_create-trails';
import { followMouse } from './_follow-mouse';
import { createLoopingPathEcsSystem } from './_looping-path.system';

const backgroundWidth = 1200;

/**
 * Builds the trails demo: four trails over a nebula, one following the
 * mouse and three moving along looping paths, on a camera that renders in
 * HDR with bloom, so trails brighter than white glow.
 * @param onTrailsReady - Called with the trails once they exist, so the
 * page's settings can change them.
 * @returns The created game.
 */
export const createTrailsGame = async (
  onTrailsReady: (trails: DemoTrails) => void,
): Promise<Game> => {
  const { game, world, renderContext, time } = createGame('demo-game');

  // HDR keeps the glowing trail's colors above 1, and bloom with a
  // threshold of 1 makes only those glow.
  const sceneTarget = createRenderTarget(
    renderContext,
    'canvas',
    RENDER_TARGET_FORMAT.hdr,
  );
  const camera = createCamera(world, {
    isStatic: true,
    renderTarget: sceneTarget,
    verticalWorldUnits: DEMO_VERTICAL_WORLD_UNITS,
  });

  addBloomComponent(world, camera, { threshold: 1, passes: 5, intensity: 2 });
  addToneMappingComponent(world, camera);

  // Created before the trails, so it draws behind them.
  const backgroundTexture = await renderContext.textureCache.getOrLoad(
    getAssetUrl('img/space-shooter/nebula.png'),
  );
  const background = world.createEntity();

  addPositionComponent(world, background);
  addSpriteComponent(
    world,
    background,
    createImageSprite(backgroundTexture, {
      pixelsPerUnit: backgroundTexture.width / backgroundWidth,
    }),
  );

  const trails = await createTrails(world, renderContext);

  followMouse(world, trails.cursor, camera, renderContext);
  onTrailsReady(trails);

  world.addSystem(createLoopingPathEcsSystem(time));
  // The trail system reads the world positions the transform system
  // writes, and adds the meshes the render system draws.
  world.addSystem(createTransformEcsSystem());
  world.addSystem(createTrailEcsSystem(time, renderContext));
  world.addSystem(createRenderEcsSystem(renderContext));
  world.addSystem(createBloomEcsSystem(renderContext));
  world.addSystem(createToneMapEcsSystem(renderContext));
  world.addSystem(createPresentEcsSystem(renderContext));

  return game;
};
