import { Game, registerCamera } from '@forge-game-engine/forge/ecs';
import { RenderSystem } from '@forge-game-engine/forge/rendering';
import { createGame } from '@forge-game-engine/forge/utilities';
import {
  ParticleEmitterSystem,
  ParticlePositionSystem,
} from '@forge-game-engine/forge/particles';
import { AudioSystem } from '@forge-game-engine/forge/audio';
import {
  LifetimeTrackingSystem,
  RemoveFromWorldLifecycleSystem,
} from '@forge-game-engine/forge/lifecycle';
import { MovementSystem } from './_movement.system';
import { createBackground } from './_create-background';
import { BackgroundSystem } from './_background.system';
import { createMusic } from './_create-music';
import { createInputs } from './_create-inputs';
import { createRenderLayer } from './_create-render-layer';
import { createPlayer } from './_create-player';
import { BulletSystem } from './_bullet.system';
import { GunSystem } from './_gun.system';

export const createSpaceShooterGame = async (): Promise<Game> => {
  const { game, world, renderContext, time } = createGame('demo-game');
  const cameraEntity = registerCamera(world, time);
  const { moveInput, shootInput } = createInputs(world, time, game);
  const renderLayer = createRenderLayer(world);

  await createBackground(world, cameraEntity, renderLayer, renderContext);
  await createPlayer(renderContext, cameraEntity, world, renderLayer);
  createMusic(world);

  world.addSystem(new RenderSystem(renderContext));
  world.addSystem(new MovementSystem(moveInput, time));
  world.addSystem(new BackgroundSystem(time));
  world.addSystem(new ParticleEmitterSystem(world, time));
  world.addSystem(new ParticlePositionSystem(time));
  world.addSystem(new AudioSystem(world));
  world.addSystem(new LifetimeTrackingSystem(time));
  world.addSystem(new RemoveFromWorldLifecycleSystem(world));
  world.addSystem(new GunSystem(time, shootInput, world));
  world.addSystem(new BulletSystem(time));

  return game;
};
