import {
  createCamera,
  createCameraEcsSystem,
  createRenderEcsSystem,
} from '@forge-game-engine/forge/rendering';
import { createGame, Game } from '@forge-game-engine/forge/utilities';
import {
  createPhysicsSyncEcsSystem,
  createRevoluteJointEcsSystem,
  PhysicsWorld,
} from '@forge-game-engine/forge/physics';
import { Vector2 } from '@forge-game-engine/forge/math';
import { createHinges } from './_create-hinges';
import { createPushEcsSystem } from './_push.system';

const renderLayers = {
  foreground: 1 << 0,
};

const gravity = new Vector2(0, -600);

export const createRevoluteJointGame = async (): Promise<Game> => {
  const { game, world, renderContext, time } = createGame('demo-game');

  createCamera(world, {
    isStatic: true,
    cullingMask: renderLayers.foreground,
  });

  const physicsWorld = new PhysicsWorld({ gravity });

  await createHinges(world, renderContext, renderLayers.foreground);

  // `createRevoluteJointEcsSystem` and `createPushEcsSystem` must run before
  // `createPhysicsSyncEcsSystem`, which is what steps `physicsWorld`:
  // newly-added joints need to be registered, and this tick's push impulses
  // applied, before that step happens (see the Revolute Joints guide's
  // registration-order caution).
  world.addSystem(createRevoluteJointEcsSystem(physicsWorld));
  world.addSystem(createPushEcsSystem(time));
  world.addSystem(createCameraEcsSystem(time));
  world.addSystem(createRenderEcsSystem(renderContext));
  world.addSystem(createPhysicsSyncEcsSystem(physicsWorld, time));

  return game;
};
