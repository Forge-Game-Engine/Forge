import {
  createCamera,
  createCameraEcsSystem,
  createRenderEcsSystem,
} from '@forge-game-engine/forge/rendering';
import { createGame, Game } from '@forge-game-engine/forge/utilities';
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
  createRevoluteJointEcsSystem,
} from '@forge-game-engine/forge/physics';

import { DEMO_VERTICAL_WORLD_UNITS } from '@site/src/utils/demo-camera';
import { createArmEcsSystem } from './_arm.system';
import { createCradle } from './_create-cradle';

const renderLayers = {
  foreground: 1 << 0,
};

export const createNewtonsCradleGame = async (): Promise<Game> => {
  const { game, world, renderContext, time } = createGame('demo-game');

  createCamera(world, {
    isStatic: true,
    cullingMask: renderLayers.foreground,
    verticalWorldUnits: DEMO_VERTICAL_WORLD_UNITS,
  });

  await createCradle(world, renderContext, renderLayers.foreground, {
    x: 0,
    y: DEMO_VERTICAL_WORLD_UNITS * 0.3,
  });

  const collisionPairs: CollisionPair[] = [];
  const collisionManifolds: CollisionManifold[] = [];
  const contactConstraints: ContactConstraint[] = [];

  // `createArmEcsSystem` writes each arm's `local` pose from its ball's
  // current position, so it runs before `createTransformEcsSystem`, which
  // turns every entity's `local` pose into the `world` pose that physics and
  // rendering read. The revolute joint solver must run after collision
  // resolution so each ball's hinge gets the "last word" on velocity each
  // tick.
  world.addSystem(createArmEcsSystem());
  world.addSystem(createTransformEcsSystem());
  world.addSystem(createGravityEcsSystem(time));
  world.addSystem(createBroadPhaseEcsSystem(collisionPairs));
  world.addSystem(
    createNarrowPhaseEcsSystem(collisionPairs, collisionManifolds),
  );
  world.addSystem(
    createCollisionResolutionEcsSystem(
      collisionManifolds,
      contactConstraints,
      time,
    ),
  );
  world.addSystem(createRevoluteJointEcsSystem(time));
  world.addSystem(createCameraEcsSystem(time));
  world.addSystem(createRenderEcsSystem(renderContext));
  world.addSystem(createEulerIntegrationEcsSystem(time));
  world.addSystem(createContinuousCollisionEcsSystem());

  return game;
};
