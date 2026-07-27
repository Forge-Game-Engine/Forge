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
import { DEMO_VERTICAL_WORLD_UNITS } from '@site/src/utils/demo-camera';
import { createArmEcsSystem } from './_arm.system';
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
    verticalWorldUnits: DEMO_VERTICAL_WORLD_UNITS,
  });

  const physicsWorld = new PhysicsWorld({ gravity });

  await createWreckingBall(world, renderContext, renderLayers.foreground);

  // `createRevoluteJointEcsSystem` must run before
  // `createPhysicsSyncEcsSystem`, which is what steps `physicsWorld`:
  // newly-added joints need to be registered before that step happens (see
  // the Revolute Joints guide's registration-order caution).
  // `createArmEcsSystem` only needs to run before `createRenderEcsSystem`,
  // so its updated arm is reflected in this tick's render.
  world.addSystem(createRevoluteJointEcsSystem(physicsWorld));
  world.addSystem(createArmEcsSystem());
  world.addSystem(createCameraEcsSystem(time));
  world.addSystem(createRenderEcsSystem(renderContext));
  world.addSystem(createPhysicsSyncEcsSystem(physicsWorld, time));

  return game;
};
