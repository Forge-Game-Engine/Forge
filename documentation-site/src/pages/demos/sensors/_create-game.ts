import {
  createTransformEcsSystem,
  registerFixedUpdate,
} from '@forge-game-engine/forge/common';
import {
  CollisionManifold,
  CollisionPair,
  ContactConstraint,
  createBroadPhaseEcsSystem,
  createCollisionResolutionEcsSystem,
  createContinuousCollisionEcsSystem,
  createEulerIntegrationEcsSystem,
  createGravityEcsSystem,
  createNarrowPhaseEcsSystem,
} from '@forge-game-engine/forge/physics';
import {
  createCamera,
  createCameraEcsSystem,
  createImageSprite,
  createRenderEcsSystem,
  getCameraView,
} from '@forge-game-engine/forge/rendering';
import { createGame, Game } from '@forge-game-engine/forge/utilities';
import { DEMO_VERTICAL_WORLD_UNITS } from '@site/src/utils/demo-camera';
import { getAssetUrl } from '@site/src/utils/get-asset-url';
import { createBallSpawnerEcsSystem } from './_ball-spawner.system';
import { createScene } from './_create-scene';
import { createDrainEcsSystem } from './_drain.system';
import { createTriggerZoneEcsSystem } from './_trigger-zone.system';

const renderLayers = {
  foreground: 1 << 0,
};

export const createSensorsGame = async (): Promise<Game> => {
  const { game, world, renderContext, time } = createGame('demo-game');

  const camera = createCamera(world, {
    isStatic: true,
    cullingMask: renderLayers.foreground,
    verticalWorldUnits: DEMO_VERTICAL_WORLD_UNITS,
  });

  await createScene(world, camera, renderContext, renderLayers.foreground);

  const ballTexture = await renderContext.textureCache.getOrLoad(
    getAssetUrl('img/White_Circle.png'),
  );
  const ballSprite = {
    ...createImageSprite(ballTexture, {
      pixelsPerUnit: 1,
    }),
    category: renderLayers.foreground,
  };
  const { x: width, y: height } = getCameraView(
    world,
    camera,
    renderContext,
  ).size;

  const collisionPairs: CollisionPair[] = [];
  const collisionManifolds: CollisionManifold[] = [];
  const contactConstraints: ContactConstraint[] = [];

  // The narrow phase fills every `ContactsEcsComponent` and writes only
  // solid (non-sensor) collisions to `collisionManifolds`, so resolution
  // never pushes a ball out of a sensor zone. The zone and drain systems
  // read the contacts after it, in the same fixed step: `started` and
  // `ended` describe one step, so a system that runs once per frame could
  // miss them or see them twice.
  const fixedUpdate = registerFixedUpdate(world, time);
  const physics = { group: fixedUpdate };

  world.addSystem(createTransformEcsSystem(), physics);
  world.addSystem(createGravityEcsSystem(time), physics);
  world.addSystem(createBroadPhaseEcsSystem(collisionPairs), physics);
  world.addSystem(
    createNarrowPhaseEcsSystem(collisionPairs, collisionManifolds),
    physics,
  );
  world.addSystem(createTriggerZoneEcsSystem(), physics);
  world.addSystem(createDrainEcsSystem(), physics);
  world.addSystem(
    createCollisionResolutionEcsSystem(
      collisionManifolds,
      contactConstraints,
      time,
    ),
    physics,
  );
  world.addSystem(createEulerIntegrationEcsSystem(time), physics);
  world.addSystem(createContinuousCollisionEcsSystem(), physics);

  // Once per frame, after the fixed steps. A spawned ball joins the
  // simulation at the next fixed step.
  world.addSystem(
    createBallSpawnerEcsSystem(time, ballSprite, -height / 2 - 40, width * 0.4),
  );
  world.addSystem(createTransformEcsSystem());
  world.addSystem(createCameraEcsSystem(time));
  world.addSystem(createRenderEcsSystem(renderContext));

  return game;
};
