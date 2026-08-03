import {
  createCamera,
  createCameraEcsSystem,
  createRenderEcsSystem,
} from '@forge-game-engine/forge/rendering';
import { createGame, Game } from '@forge-game-engine/forge/utilities';
import {
  CollisionManifold,
  CollisionPair,
  ContactConstraint,
  createBroadPhaseEcsSystem,
  createCollisionResolutionEcsSystem,
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

  createCamera(world, {
    isStatic: true,
    cullingMask: renderLayers.foreground,
    verticalWorldUnits: DEMO_VERTICAL_WORLD_UNITS,
  });

  await createHinges(world, renderContext, renderLayers.foreground);

  const collisionPairs: CollisionPair[] = [];
  const collisionManifolds: CollisionManifold[] = [];
  const contactConstraints: ContactConstraint[] = [];

  // Gravity and pushes must run before collision/joint resolution, so this
  // tick's forces are reflected in the velocities those solvers see; the
  // revolute joint solver must run after collision resolution so the door's
  // hinge gets the "last word" on velocity each tick.
  world.addSystem(createGravityEcsSystem(time));
  world.addSystem(createPushEcsSystem(time));
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

  return game;
};
