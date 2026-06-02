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
import { createMovementEcsSystem } from './_movement.system';
import { createBackground } from './_create-background';
import { createBackgroundEcsSystem } from './_background.system';
import { createMusic } from './_create-music';
import { createInputs } from './_create-inputs';
import { createPlayer } from './_create-player';
import { createBulletEcsSystem } from './_bullet.system';
import { createGunEcsSystem } from './_gun.system';

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
  createMusic(world);

  world.addSystem(createCameraEcsSystem(time));
  world.addSystem(createRenderEcsSystem(renderContext));
  world.addSystem(createMovementEcsSystem(moveInput, time));
  world.addSystem(createBackgroundEcsSystem(time));
  world.addSystem(createAudioEcsSystem());
  world.addSystem(createLifetimeTrackingEcsSystem(time));
  world.addSystem(createRemoveFromWorldEcsSystem());
  world.addSystem(createGunEcsSystem(time, world, shootInput));
  world.addSystem(createBulletEcsSystem(time));

  return game;
};
