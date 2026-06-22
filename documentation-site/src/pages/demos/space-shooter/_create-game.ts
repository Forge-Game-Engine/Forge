import { createSpriteAnimationEcsSystem } from '@forge-game-engine/forge/animations';
import {
  addCamera,
  CameraEcsComponent,
  cameraId,
  createCameraEcsSystem,
  createRenderEcsSystem,
} from '@forge-game-engine/forge/rendering';
import { createGame, Game } from '@forge-game-engine/forge/utilities';
import { createAudioEcsSystem } from '@forge-game-engine/forge/audio';
import {
  createLifetimeTrackingEcsSystem,
  createRemoveFromWorldEcsSystem,
} from '@forge-game-engine/forge/lifecycle';
import { Random, Vector2 } from '@forge-game-engine/forge/math';
import {
  createPhysicsEcsSystem,
  PhysicsWorld,
} from '@forge-game-engine/forge/physics';
import { createMovementEcsSystem } from './_movement.system';
import { createBackground } from './_create-background';
import { createBackgroundEcsSystem } from './_background.system';
import {
  CameraShakeEcsComponent,
  cameraShakeId,
} from './_camera-shake.component';
import { createCameraShakeEcsSystem } from './_camera-shake.system';
import { createExplosionSpawner } from './_create-explosions';
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

// A fraction of the canvas's smaller dimension, so the shake reads as the
// same proportional jolt regardless of the canvas's actual resolution.
const explosionShakeIntensityFraction = 0.007;
const explosionShakeDurationSeconds = 0.15;

export const createSpaceShooterGame = async (): Promise<Game> => {
  const { game, world, renderContext, time } = createGame('demo-game');

  // The background sits on its own static camera so it doesn't shake along
  // with the foreground when an explosion happens.
  addCamera(world, {
    layerMask: renderLayers.background,
    isStatic: true,
  });
  addCamera(world, { layerMask: renderLayers.foreground });

  const cameraEntities: number[] = [];
  world.queryEntities([cameraId], cameraEntities);

  const cameraEntity = cameraEntities.find(
    (entity) =>
      world.getComponent<CameraEcsComponent>(entity, cameraId)?.layerMask ===
      renderLayers.foreground,
  );

  if (cameraEntity === undefined) {
    throw new Error('Foreground camera entity not found.');
  }

  world.addComponent(cameraEntity, cameraShakeId, {
    intensity: 0,
    durationSeconds: 0,
    elapsedSeconds: 0,
    currentOffset: Vector2.zero,
    nextOffsetChangeSeconds: 0,
  });

  const triggerCameraShake = (): void => {
    const shakeComponent = world.getComponent<CameraShakeEcsComponent>(
      cameraEntity,
      cameraShakeId,
    );

    if (!shakeComponent) {
      return;
    }

    const canvasMinDimension = Math.min(
      renderContext.canvas.width,
      renderContext.canvas.height,
    );

    shakeComponent.intensity =
      explosionShakeIntensityFraction * canvasMinDimension;
    shakeComponent.durationSeconds = explosionShakeDurationSeconds;
    shakeComponent.elapsedSeconds = 0;
    shakeComponent.nextOffsetChangeSeconds = 0;
  };

  const { moveInput, shootInput } = createInputs(world, time, game);

  await createBackground(world, renderContext, renderLayers.background);
  await createPlayer(renderContext, world, renderLayers.foreground);
  await createAsteroidSpawner(world, renderContext, renderLayers.foreground);
  const explosionSpawner = await createExplosionSpawner(
    renderContext,
    renderLayers.foreground,
    triggerCameraShake,
  );
  createMusic(world);

  const random = new Random();
  const physicsWorld = new PhysicsWorld();

  world.addSystem(createCameraEcsSystem(time));
  world.addSystem(createCameraShakeEcsSystem(time, random));
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
  world.addSystem(
    createSpriteAnimationEcsSystem(time, explosionSpawner.animationRegistry),
  );
  world.addSystem(createPhysicsEcsSystem(physicsWorld, time));
  world.addSystem(
    createAsteroidCollisionEcsSystem(physicsWorld, time, explosionSpawner),
  );

  return game;
};
