import {
  createCamera,
  createCameraEcsSystem,
  createRenderEcsSystem,
  getCameraView,
} from '@forge-game-engine/forge/rendering';
import { createGame, Game } from '@forge-game-engine/forge/utilities';
import { createTransformEcsSystem } from '@forge-game-engine/forge/common';
import {
  CollisionManifold,
  CollisionPair,
  ContactConstraint,
  createBroadPhaseEcsSystem,
  createCollisionResolutionEcsSystem,
  createContinuousCollisionEcsSystem,
  createEulerIntegrationEcsSystem,
  createGravityEcsSystem,
  createNarrowPhaseEcsSystem,
} from '@forge-game-engine/forge/physics';
import { DEMO_VERTICAL_WORLD_UNITS } from '@site/src/utils/demo-camera';
import { createBoundaries } from './_create-boundaries';
import { createPlatform, platformHeight } from './_create-platform';
import { createPlatformMoverEcsSystem } from './_platform-mover.system';
import { crateSize, loadCrateSprite, spawnCrate } from './_spawn-crates';

const renderLayers = {
  foreground: 1 << 0,
};

export const createMovingPlatformGame = async (): Promise<Game> => {
  const { game, world, renderContext, time } = createGame('demo-game');

  const camera = createCamera(world, {
    isStatic: true,
    cullingMask: renderLayers.foreground,
    verticalWorldUnits: DEMO_VERTICAL_WORLD_UNITS,
  });

  const { x: width, y: height } = getCameraView(
    world,
    camera,
    renderContext,
  ).size;
  const platformY = -height * 0.15;
  const leftX = -width * 0.25;
  const rightX = width * 0.25;

  await createBoundaries(world, camera, renderContext, renderLayers.foreground);
  await createPlatform(
    world,
    renderContext,
    renderLayers.foreground,
    leftX,
    rightX,
    platformY,
  );

  const crateSprite = await loadCrateSprite(
    renderContext,
    renderLayers.foreground,
  );

  // A small starting stack above the platform's initial (leftmost) position,
  // so it's immediately obvious the platform carries whatever lands on it.
  const platformSurfaceY = platformY + platformHeight / 2 + crateSize / 2 + 8;

  for (let i = 0; i < 3; i++) {
    spawnCrate(world, crateSprite, {
      x: leftX + (i - 1) * (crateSize + 4),
      y: platformSurfaceY + i * (crateSize + 4),
    });
  }

  const collisionPairs: CollisionPair[] = [];
  const collisionManifolds: CollisionManifold[] = [];
  const contactConstraints: ContactConstraint[] = [];

  // `createTransformEcsSystem` runs first so every body's `world` pose
  // matches the `local` pose euler integration wrote at the end of the
  // previous tick before the physics and render systems read it. Gravity and
  // the platform's own mover must run before collision resolution, so this
  // tick's velocity changes are reflected in the solver; euler integration
  // runs last so it moves every body (dynamic crates and the kinematic
  // platform alike) from this tick's resolved velocity.
  world.addSystem(createTransformEcsSystem());
  world.addSystem(createGravityEcsSystem(time));
  world.addSystem(createPlatformMoverEcsSystem());
  world.addSystem(createBroadPhaseEcsSystem(collisionPairs));
  world.addSystem(
    createNarrowPhaseEcsSystem(collisionPairs, collisionManifolds),
  );
  world.addSystem(
    createCollisionResolutionEcsSystem(
      collisionManifolds,
      contactConstraints,
      time,
    ),
  );
  world.addSystem(createCameraEcsSystem(time));
  world.addSystem(createRenderEcsSystem(renderContext));
  world.addSystem(createEulerIntegrationEcsSystem(time));
  world.addSystem(createContinuousCollisionEcsSystem());

  // Click anywhere to drop another crate at that position.
  renderContext.canvas.addEventListener('mousedown', (event: MouseEvent) => {
    const canvasBounds = renderContext.canvas.getBoundingClientRect();

    const screenPosition = {
      x: event.clientX - canvasBounds.left,
      y: event.clientY - canvasBounds.top,
    };

    const worldPosition = getCameraView(
      world,
      camera,
      renderContext,
    ).viewportToWorld(screenPosition);

    spawnCrate(world, crateSprite, worldPosition);
  });

  return game;
};
