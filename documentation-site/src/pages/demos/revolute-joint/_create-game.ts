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
  createBroadPhaseEcsSystem,
  createCollisionResolutionEcsSystem,
  createContinuousCollisionEcsSystem,
  createEulerIntegrationEcsSystem,
  createGravityEcsSystem,
  createNarrowPhaseEcsSystem,
  createRevoluteJointEcsSystem,
} from '@forge-game-engine/forge/physics';
import { DEMO_VERTICAL_WORLD_UNITS } from '@site/src/utils/demo-camera';
import { createHinges } from './_create-hinges';
import { createPushEcsSystem } from './_push.system';

const renderLayers = {
  foreground: 1 << 0,
};

export const createRevoluteJointGame = async (): Promise<Game> => {
  const { game, world, renderContext, time } = createGame('demo-game');

  const camera = createCamera(world, {
    isStatic: true,
    cullingMask: renderLayers.foreground,
    verticalWorldUnits: DEMO_VERTICAL_WORLD_UNITS,
  });

  await createHinges(world, camera, renderContext, renderLayers.foreground);

  const collisionPairs: CollisionPair[] = [];
  const collisionManifolds: CollisionManifold[] = [];
  const contactConstraints: ContactConstraint[] = [];

  const fixedUpdate = registerFixedUpdate(world, time);
  const physics = { group: fixedUpdate };

  // Once per fixed step. `createTransformEcsSystem` runs first so every
  // body's `world` pose matches the `local` pose the previous step's
  // integration wrote before the push and physics systems read it. Gravity
  // and pushes must run before collision/joint resolution, so this step's
  // forces are reflected in the velocities those solvers see; the revolute
  // joint solver must run after collision resolution so the door's hinge
  // gets the "last word" on velocity each step. The push counts its
  // interval in fixed steps, so it fires at the same simulated time at any
  // frame rate.
  world.addSystem(createTransformEcsSystem(), physics);
  world.addSystem(createGravityEcsSystem(time), physics);
  world.addSystem(createPushEcsSystem(time), physics);
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

  // Once per frame, after the fixed steps, so the frame draws the latest
  // step's poses.
  world.addSystem(createTransformEcsSystem());
  world.addSystem(createCameraEcsSystem(time));
  world.addSystem(createRenderEcsSystem(renderContext));

  return game;
};
