import { createTransformEcsSystem } from '@forge-game-engine/forge/common';
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

  const ballImage = await renderContext.imageCache.getOrLoad(
    getAssetUrl('img/White_Circle.png'),
  );
  const ballSprite = createImageSprite(ballImage, renderContext, {
    pixelsPerUnit: 1,
    layer: renderLayers.foreground,
  });
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
  // read the contacts after it, in the same tick.
  world.addSystem(
    createBallSpawnerEcsSystem(time, ballSprite, height / 2 + 40, width * 0.4),
  );
  world.addSystem(createTransformEcsSystem());
  world.addSystem(createGravityEcsSystem(time));
  world.addSystem(createBroadPhaseEcsSystem(collisionPairs));
  world.addSystem(
    createNarrowPhaseEcsSystem(collisionPairs, collisionManifolds),
  );
  world.addSystem(createTriggerZoneEcsSystem());
  world.addSystem(createDrainEcsSystem());
  world.addSystem(
    createCollisionResolutionEcsSystem(
      collisionManifolds,
      contactConstraints,
      time,
    ),
  );
  world.addSystem(createCameraEcsSystem(time));
  world.addSystem(createRenderEcsSystem(renderContext));
  world.addSystem(createEulerIntegrationEcsSystem(time));
  world.addSystem(createContinuousCollisionEcsSystem());

  return game;
};
