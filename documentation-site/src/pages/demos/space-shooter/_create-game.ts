import {
  addCamera,
  createCameraEcsSystem,
  createRenderEcsSystem,
} from '@forge-game-engine/forge/rendering';
import { createGame, Game } from '@forge-game-engine/forge/utilities';
import { createAudioEcsSystem } from '@forge-game-engine/forge/audio';
import {
  createLifetimeTrackingEcsSystem,
  createRemoveFromWorldEcsSystem,
} from '@forge-game-engine/forge/lifecycle';
import { Random } from '@forge-game-engine/forge/math';
import {
  createPhysicsEcsSystem,
  createPhysicsWorld,
} from '@forge-game-engine/forge/physics';
import { createMovementEcsSystem } from './_movement.system';
import { createBackground } from './_create-background';
import { createBackgroundEcsSystem } from './_background.system';
import { createMusic } from './_create-music';
import { createInputs } from './_create-inputs';
import { createPlayer } from './_create-player';
import { createBulletEcsSystem } from './_bullet.system';
import { createGunEcsSystem } from './_gun.system';
import { createAsteroidSpawner } from './_create-asteroids';
import { createAsteroidEcsSystem } from './_asteroid.system';
import { createAsteroidSpawnerEcsSystem } from './_asteroid-spawner.system';
import { createAsteroidCollisionEcsSystem } from './_collision.system';

const renderLayers = {
  background: 1 << 0,
  foreground: 1 << 1,
};

export const createSpaceShooterGame = async (): Promise<Game> => {
  const { game, world, renderContext, time } = createGame('demo-game');
  addCamera(world);
  const { moveInput, shootInput } = createInputs(world, time, game);

  await createBackground(world, renderContext, renderLayers.background);
  await createPlayer(renderContext, world, renderLayers.foreground);
  await createAsteroidSpawner(world, renderContext, renderLayers.foreground);
  createMusic(world);

  const random = new Random();
  const physicsWorld = createPhysicsWorld();

  world.addSystem(createCameraEcsSystem(time));
  world.addSystem(createRenderEcsSystem(renderContext));
  world.addSystem(createMovementEcsSystem(moveInput, time));
  world.addSystem(createBackgroundEcsSystem(time));
  world.addSystem(createAudioEcsSystem());
  world.addSystem(createLifetimeTrackingEcsSystem(time));
  world.addSystem(createRemoveFromWorldEcsSystem());
  world.addSystem(createGunEcsSystem(time, world, shootInput));
  world.addSystem(createBulletEcsSystem(time));
  world.addSystem(createAsteroidSpawnerEcsSystem(time, random));
  world.addSystem(createAsteroidEcsSystem(time, renderContext));
  world.addSystem(createPhysicsEcsSystem(physicsWorld, time));
  world.addSystem(createAsteroidCollisionEcsSystem(physicsWorld));

  return game;
};
