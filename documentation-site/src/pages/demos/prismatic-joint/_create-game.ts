import {
  createCamera,
  createCameraEcsSystem,
  createRenderEcsSystem,
} from '@forge-game-engine/forge/rendering';
import { createGame, Game } from '@forge-game-engine/forge/utilities';
import {
  createPhysicsEcsSystem,
  createPrismaticJointEcsSystem,
  PhysicsWorld,
} from '@forge-game-engine/forge/physics';
import { Vector2 } from '@forge-game-engine/forge/math';
import { createSliders } from './_create-sliders';
import { createPumpEcsSystem } from './_pump.system';

const renderLayers = {
  foreground: 1 << 0,
};

const gravity = new Vector2(0, -600);

export const createPrismaticJointGame = async (): Promise<Game> => {
  const { game, world, renderContext, time } = createGame('demo-game');

  createCamera(world, {
    isStatic: true,
    cullingMask: renderLayers.foreground,
  });

  const physicsWorld = new PhysicsWorld({ gravity });

  await createSliders(world, renderContext, renderLayers.foreground);

  // `createPrismaticJointEcsSystem` and `createPumpEcsSystem` must run
  // before `createPhysicsEcsSystem`, which is what steps `physicsWorld`:
  // newly-added joints need to be registered, and this tick's pump impulses
  // applied, before that step happens (see the Prismatic Joints guide's
  // registration-order caution).
  world.addSystem(createPrismaticJointEcsSystem(physicsWorld));
  world.addSystem(createPumpEcsSystem(time));
  world.addSystem(createCameraEcsSystem(time));
  world.addSystem(createRenderEcsSystem(renderContext));
  world.addSystem(createPhysicsEcsSystem(physicsWorld, time));

  return game;
};
