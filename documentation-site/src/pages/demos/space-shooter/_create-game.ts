import { createSpriteAnimationEcsSystem } from '@forge-game-engine/forge/animations';
import {
  addBloom,
  addCamera,
  addGaussianBlur,
  addToneMapping,
  BloomEcsComponent,
  createBloomEcsSystem,
  createCameraEcsSystem,
  createGaussianBlurEcsSystem,
  createPresentEcsSystem,
  createRenderEcsSystem,
  createRenderTarget,
  createToneMapEcsSystem,
  GaussianBlurEcsComponent,
  RENDER_TARGET_FORMAT,
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
import { createPlayer, spawnPlayer } from './_create-player';
import { createBulletEcsSystem } from './_bullet.system';
import { createGunEcsSystem } from './_gun.system';
import { createAsteroidSpawner } from './_create-asteroids';
import { createAsteroidEcsSystem } from './_asteroid.system';
import { createAsteroidSpawnerEcsSystem } from './_asteroid-spawner.system';
import { createAsteroidCollisionEcsSystem } from './_collision.system';
import { GameOverEcsComponent, gameOverId } from './_game-over.component';
import { createGameOverEcsSystem } from './_game-over.system';

const renderLayers = {
  background: 1 << 0,
  foreground: 1 << 1,
};

// A fraction of the canvas's smaller dimension, so the shake reads as the
// same proportional jolt regardless of the canvas's actual resolution.
const explosionShakeIntensityFraction = 0.007;
const explosionShakeDurationSeconds = 0.15;

export const bloomDefaults: BloomEcsComponent = {
  threshold: 0.65,
  passes: 3,
  intensity: 1.5,
};

export const blurDefaults: GaussianBlurEcsComponent = {
  passes: 4,
  intensity: 1,
};

export const createSpaceShooterGame = async (
  onBloomReady?: (bloom: BloomEcsComponent) => void,
  onBlurReady?: (blur: GaussianBlurEcsComponent) => void,
): Promise<Game> => {
  const { game, world, renderContext, time } = createGame('demo-game');

  // Background and foreground each get their own off-screen target, so the
  // blur post-process pass can affect the background only: the present
  // pass then layers the sharp foreground back on top of the blurred
  // background when it draws both to the canvas.
  const backgroundRenderTarget = createRenderTarget(
    renderContext.gl,
    renderContext.width,
    renderContext.height,
  );
  // HDR so the bullet's emissive map (see _create-player.ts) can bloom
  // based on true brightness rather than an 8-bit white ceiling;
  // addToneMapping compresses it back to displayable range before the
  // present pass draws it.
  const foregroundRenderTarget = createRenderTarget(
    renderContext.gl,
    renderContext.width,
    renderContext.height,
    RENDER_TARGET_FORMAT.hdr,
  );

  // The background sits on its own static camera so it doesn't shake along
  // with the foreground when an explosion happens.
  const backgroundCameraEntity = addCamera(world, {
    cullingMask: renderLayers.background,
    isStatic: true,
    renderTarget: backgroundRenderTarget,
  });
  const foregroundCameraEntity = addCamera(world, {
    cullingMask: renderLayers.foreground,
    renderTarget: foregroundRenderTarget,
  });

  // The component is handed back to the caller (see the sliders on this
  // demo's page) so it can be retuned live.
  const blurComponent = addGaussianBlur(
    world,
    backgroundCameraEntity,
    blurDefaults,
  );

  onBlurReady?.(blurComponent);

  // Bullets and explosion flashes are the brightest things in the
  // foreground, so a bloom glow makes them read as glowing/energetic
  // instead of flat sprites. The component is handed back to the caller
  // (see the sliders on this demo's page) so it can be retuned live.
  const bloomComponent = addBloom(world, foregroundCameraEntity, bloomDefaults);

  onBloomReady?.(bloomComponent);

  addToneMapping(world, foregroundCameraEntity);

  world.addComponent(foregroundCameraEntity, cameraShakeId, {
    intensity: 0,
    durationSeconds: 0,
    elapsedSeconds: 0,
    currentOffset: Vector2.zero,
    nextOffsetChangeSeconds: 0,
  });

  const triggerCameraShake = (): void => {
    const shakeComponent = world.getComponent<CameraShakeEcsComponent>(
      foregroundCameraEntity,
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

  const { moveInput, shootInput, restartInput } = createInputs(
    world,
    time,
    game,
  );

  await createBackground(world, renderContext, renderLayers.background);
  const playerSprites = await createPlayer(
    renderContext,
    world,
    renderLayers.foreground,
  );
  await createAsteroidSpawner(world, renderContext, renderLayers.foreground);
  const explosionSpawner = await createExplosionSpawner(
    renderContext,
    renderLayers.foreground,
    triggerCameraShake,
  );
  createMusic(world);

  const gameOverEntity = world.createEntity();
  const gameOverMessageElement = document.createElement('div');

  gameOverMessageElement.textContent = "Press 'R' to restart";
  gameOverMessageElement.style.cssText = `
    position: absolute;
    inset: 0;
    display: none;
    align-items: center;
    justify-content: center;
    color: white;
    font-family: sans-serif;
    font-size: 2rem;
    text-shadow: 0 0 8px black;
    pointer-events: none;
    z-index: 1;
  `;

  game.container.appendChild(gameOverMessageElement);

  world.addComponent(gameOverEntity, gameOverId, {
    isGameOver: false,
    messageElement: gameOverMessageElement,
  });

  const respawnPlayer = (): void => {
    spawnPlayer(renderContext, world, renderLayers.foreground, playerSprites);
  };

  const onPlayerDeath = (): void => {
    const gameOverComponent = world.getComponent<GameOverEcsComponent>(
      gameOverEntity,
      gameOverId,
    );

    if (gameOverComponent) {
      gameOverComponent.isGameOver = true;
    }
  };

  const random = new Random();
  const physicsWorld = new PhysicsWorld();

  world.addSystem(createCameraEcsSystem(time));
  world.addSystem(createCameraShakeEcsSystem(time, random));
  world.addSystem(createRenderEcsSystem(renderContext));
  world.addSystem(createBloomEcsSystem(renderContext));
  world.addSystem(createGaussianBlurEcsSystem(renderContext));
  world.addSystem(createToneMapEcsSystem(renderContext));
  world.addSystem(createPresentEcsSystem(renderContext));
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
    createAsteroidCollisionEcsSystem(
      physicsWorld,
      time,
      explosionSpawner,
      onPlayerDeath,
    ),
  );
  world.addSystem(createGameOverEcsSystem(restartInput, respawnPlayer));

  return game;
};
