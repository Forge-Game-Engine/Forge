import {
  addPositionComponent,
  createTransformEcsSystem,
  createTransformInterpolationEcsSystem,
  registerFixedUpdate,
  Time,
} from '@forge-game-engine/forge/common';
import { EcsWorld } from '@forge-game-engine/forge/ecs';
import defaultFontImageUrl from '@forge-game-engine/forge/fonts/default/default.png';
import {
  CollisionManifold,
  CollisionPair,
  ContactConstraint,
  createBroadPhase,
  createBroadPhaseEcsSystem,
  createCollisionResolutionEcsSystem,
  createContinuousCollisionEcsSystem,
  createEulerIntegrationEcsSystem,
  createGravityEcsSystem,
  createNarrowPhaseEcsSystem,
  createRevoluteJointEcsSystem,
} from '@forge-game-engine/forge/physics';
import {
  addSpriteComponent,
  Color,
  createCamera,
  createCameraEcsSystem,
  createImageSprite,
  createRenderEcsSystem,
  getCameraView,
  RenderContext,
} from '@forge-game-engine/forge/rendering';
import {
  createTextShapingEcsSystem,
  FontAtlasCache,
} from '@forge-game-engine/forge/text';
import { createGame, Game } from '@forge-game-engine/forge/utilities';
import { DEMO_VERTICAL_WORLD_UNITS } from '@site/src/utils/demo-camera';
import { getAssetUrl } from '@site/src/utils/get-asset-url';
import { createRow, RowSprites } from './_create-row';
import {
  addFixedStepCounterComponent,
  FixedStepCounterEcsComponent,
} from './_fixed-step-counter.component';
import { createFixedStepCounterEcsSystem } from './_fixed-step-counter.system';

/** What the page's controls read and change while the game runs. */
export interface FixedTimestepDemo {
  time: Time;
  stepCounter: FixedStepCounterEcsComponent;
}

async function loadRowSprites(
  renderContext: RenderContext,
): Promise<RowSprites> {
  const { textureCache } = renderContext;
  const [ballTexture, blockTexture] = await Promise.all([
    textureCache.getOrLoad(getAssetUrl('img/physics/ball_blue_large.png')),
    textureCache.getOrLoad(getAssetUrl('img/physics/block_square.png')),
  ]);

  return {
    ball: createImageSprite(ballTexture, { pixelsPerUnit: 1 }),
    block: createImageSprite(blockTexture, { pixelsPerUnit: 1 }),
  };
}

function createDivider(
  world: EcsWorld,
  renderContext: RenderContext,
  width: number,
): void {
  const divider = world.createEntity();

  addPositionComponent(world, divider);
  addSpriteComponent(world, divider, {
    ...createImageSprite(renderContext.whiteTexture, { pixelsPerUnit: 1 }),
    width,
    height: 2,
    tintColor: new Color(1, 1, 1, 0.25),
  });
}

/**
 * Builds the fixed timestep demo: two rows simulating the same pendulum and
 * bouncing ball in fixed steps, the top row drawn between its last two steps
 * and the bottom row drawn where the latest step left it.
 * @param onDemoReady - Called once the scene exists, so the page's controls
 * can change the step rate and read the step count.
 * @returns The created game.
 */
export const createFixedTimestepGame = async (
  onDemoReady: (demo: FixedTimestepDemo) => void,
): Promise<Game> => {
  const { game, world, renderContext, time } = createGame('demo-game');

  const camera = createCamera(world, {
    isStatic: true,
    verticalWorldUnits: DEMO_VERTICAL_WORLD_UNITS,
  });

  // The engine ships a default font. Importing its JSON would give the
  // parsed contents, so `new URL` asks webpack for the file's URL instead.
  const fontAtlas = await new FontAtlasCache(renderContext).getOrLoad({
    metricsUrl: new URL(
      '@forge-game-engine/forge/fonts/default/default.json',
      import.meta.url,
    ).href,
    imageUrl: defaultFontImageUrl,
  });
  const sprites = await loadRowSprites(renderContext);

  const { x: width, y: height } = getCameraView(
    world,
    camera,
    renderContext,
  ).size;
  const left = -width / 2;
  const right = width / 2;
  const top = -height / 2;

  createRow(world, sprites, fontAtlas, { left, right, top, bottom: 0 }, true);
  createRow(
    world,
    sprites,
    fontAtlas,
    { left, right, top: 0, bottom: height / 2 },
    false,
  );
  createDivider(world, renderContext, width);

  const stepCounter = addFixedStepCounterComponent(world, world.createEntity());

  const collisionPairs: CollisionPair[] = [];
  const collisionManifolds: CollisionManifold[] = [];
  const contactConstraints: ContactConstraint[] = [];

  createBroadPhase(world);

  const fixedUpdate = registerFixedUpdate(world, time);
  const physics = { group: fixedUpdate };

  // Once per fixed step, at `time.fixedDeltaTimeInMilliseconds`, in the
  // order the physics systems are documented in. The step counter counts
  // how many times this group runs each frame.
  world.addSystem(createFixedStepCounterEcsSystem(time), physics);
  world.addSystem(createTransformEcsSystem(time), physics);
  world.addSystem(createBroadPhaseEcsSystem(collisionPairs), physics);
  world.addSystem(
    createNarrowPhaseEcsSystem(collisionPairs, collisionManifolds),
    physics,
  );
  world.addSystem(createGravityEcsSystem(time), physics);
  world.addSystem(
    createCollisionResolutionEcsSystem(
      collisionManifolds,
      contactConstraints,
      time,
    ),
    physics,
  );
  world.addSystem(createRevoluteJointEcsSystem(time), physics);
  world.addSystem(createEulerIntegrationEcsSystem(time), physics);
  world.addSystem(createContinuousCollisionEcsSystem(), physics);
  // Records where each interpolated body ended the step. It runs after
  // everything that moves bodies in the step.
  world.addSystem(createTransformInterpolationEcsSystem(), physics);

  // Once per frame, after the frame's fixed steps. The transform system
  // draws each interpolated body between its last two steps, by
  // `time.fixedOverstepFraction`, and every other body at `local`.
  world.addSystem(createTransformEcsSystem(time));
  world.addSystem(createCameraEcsSystem(time));
  world.addSystem(createTextShapingEcsSystem());
  world.addSystem(createRenderEcsSystem(renderContext));

  onDemoReady({ time, stepCounter });

  return game;
};
