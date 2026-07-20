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
import { createWreckingBall } from './_create-wrecking-ball';

const renderLayers = {
  foreground: 1 << 0,
};

const gravity = new Vector2(0, -600);

export const createWreckingBallGame = async (): Promise<Game> => {
  const { game, world, renderContext, time } = createGame('demo-game');

  createCamera(world, {
    isStatic: true,
    cullingMask: renderLayers.foreground,
  });

  const physicsWorld = new PhysicsWorld({ gravity });

  await createWreckingBall(world, renderContext, renderLayers.foreground);

  // `createRevoluteJointEcsSystem` must run before
  // `createPhysicsSyncEcsSystem`, which is what steps `physicsWorld`:
  // newly-added joints need to be registered before that step happens (see
  // the Revolute Joints guide's registration-order caution).
  world.addSystem(createRevoluteJointEcsSystem(physicsWorld));
  world.addSystem(createCameraEcsSystem(time));
  world.addSystem(createRenderEcsSystem(renderContext));
  world.addSystem(createPhysicsSyncEcsSystem(physicsWorld, time));

  return game;
};
