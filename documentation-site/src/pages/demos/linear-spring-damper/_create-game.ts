import {
  createCamera,
  createCameraEcsSystem,
  createRenderEcsSystem,
} from '@forge-game-engine/forge/rendering';
import { createGame, Game } from '@forge-game-engine/forge/utilities';
import {
  createLinearDamperEcsSystem,
  createLinearSpringEcsSystem,
  createPhysicsSyncEcsSystem,
  PhysicsWorld,
} from '@forge-game-engine/forge/physics';
import { Vector2 } from '@forge-game-engine/forge/math';
import { createSuspensions } from './_create-suspensions';
import { createResetEcsSystem } from './_reset.system';
import { createSpringLineEcsSystem } from './_spring-line.system';

const renderLayers = {
  foreground: 1 << 0,
};

const gravity = new Vector2(0, -600);

export const createLinearSpringDamperGame = async (): Promise<Game> => {
  const { game, world, renderContext, time } = createGame('demo-game');

  createCamera(world, {
    isStatic: true,
    cullingMask: renderLayers.foreground,
  });

  const physicsWorld = new PhysicsWorld({ gravity });

  await createSuspensions(world, renderContext, renderLayers.foreground);

  // `createResetEcsSystem`, `createLinearSpringEcsSystem`, and
  // `createLinearDamperEcsSystem` must all run before
  // `createPhysicsSyncEcsSystem`, which is what steps `physicsWorld`: a
  // reset applied (or spring/damper force computed) this tick needs to be
  // applied before that step happens (see the Applying Forces guide's
  // registration-order caution). `createSpringLineEcsSystem` only needs to
  // run before `createRenderEcsSystem`, so its updated line is reflected in
  // this tick's render.
  world.addSystem(createResetEcsSystem(time));
  world.addSystem(createLinearSpringEcsSystem(time));
  world.addSystem(createLinearDamperEcsSystem(time));
  world.addSystem(createSpringLineEcsSystem());
  world.addSystem(createCameraEcsSystem(time));
  world.addSystem(createRenderEcsSystem(renderContext));
  world.addSystem(createPhysicsSyncEcsSystem(physicsWorld, time));

  return game;
};
