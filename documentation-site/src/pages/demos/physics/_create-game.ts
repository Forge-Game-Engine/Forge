import {
  addCamera,
  createCameraEcsSystem,
  createRenderEcsSystem,
} from '@forge-game-engine/forge/rendering';
import { createGame, Game } from '@forge-game-engine/forge/utilities';
import {
  createPhysicsEcsSystem,
  PhysicsWorld,
} from '@forge-game-engine/forge/physics';
import { Vector2 } from '@forge-game-engine/forge/math';
import { createBoundaries } from './_create-boundaries';
import { spawnShapes } from './_spawn-shapes';

const renderLayers = {
  foreground: 1 << 0,
};

const gravity = new Vector2(0, -300);

export const createPhysicsGame = async (): Promise<Game> => {
  const { game, world, renderContext, time } = createGame('demo-game');

  addCamera(world, {
    isStatic: true,
    layerMask: renderLayers.foreground,
  });

  const physicsWorld = new PhysicsWorld({ gravity });

  await createBoundaries(world, renderContext, renderLayers.foreground);
  await spawnShapes(world, renderContext, renderLayers.foreground);

  world.addSystem(createCameraEcsSystem(time));
  world.addSystem(createRenderEcsSystem(renderContext));
  world.addSystem(createPhysicsEcsSystem(physicsWorld, time));

  return game;
};
