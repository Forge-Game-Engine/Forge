import {
  createCamera,
  createCameraEcsSystem,
  createRenderEcsSystem,
} from '@forge-game-engine/forge/rendering';
import { createGame, Game } from '@forge-game-engine/forge/utilities';
import {
  createTransformEcsSystem,
  registerFixedUpdate,
} from '@forge-game-engine/forge/common';
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
    y: -DEMO_VERTICAL_WORLD_UNITS * 0.3,
  });

  const collisionPairs: CollisionPair[] = [];
  const collisionManifolds: CollisionManifold[] = [];
  const contactConstraints: ContactConstraint[] = [];

  const fixedUpdate = registerFixedUpdate(world, time);
  const physics = { group: fixedUpdate };

  // Once per fixed step. The transform system runs first so each step reads
  // the poses the previous step's integration left in `local`. The revolute
  // joint solver must run after collision resolution so each ball's hinge
  // gets the "last word" on velocity each step.
  world.addSystem(createTransformEcsSystem(), physics);
  world.addSystem(createGravityEcsSystem(time), physics);
  createBroadPhase(world);
  world.addSystem(createBroadPhaseEcsSystem(collisionPairs), physics);
  world.addSystem(
    createNarrowPhaseEcsSystem(collisionPairs, collisionManifolds),
    physics,
  );
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

  // Once per frame, after the fixed steps. `createArmEcsSystem` writes each
  // arm's `local` pose from its ball's latest position, so it runs before
  // the transform system that turns every `local` pose into the `world`
  // pose rendering reads.
  world.addSystem(createArmEcsSystem());
  world.addSystem(createTransformEcsSystem());
  world.addSystem(createCameraEcsSystem(time));
  world.addSystem(createRenderEcsSystem(renderContext));

  return game;
};
