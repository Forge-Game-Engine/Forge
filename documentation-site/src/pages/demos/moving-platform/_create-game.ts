import {
  createCamera,
  createCameraEcsSystem,
  createRenderEcsSystem,
  getCameraView,
} from '@forge-game-engine/forge/rendering';
import { createGame, Game } from '@forge-game-engine/forge/utilities';
import {
  createTransformEcsSystem,
  createTransformInterpolationEcsSystem,
  registerFixedUpdate,
} from '@forge-game-engine/forge/common';
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
  const platformY = height * 0.15;
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
  const platformSurfaceY = platformY - platformHeight / 2 - crateSize / 2 - 8;

  for (let i = 0; i < 3; i++) {
    spawnCrate(world, crateSprite, {
      x: leftX + (i - 1) * (crateSize + 4),
      y: platformSurfaceY - i * (crateSize + 4),
    });
  }

  const collisionPairs: CollisionPair[] = [];
  const collisionManifolds: CollisionManifold[] = [];
  const contactConstraints: ContactConstraint[] = [];

  const fixedUpdate = registerFixedUpdate(world, time);
  const physics = { group: fixedUpdate };

  // Once per fixed step. `createTransformEcsSystem` runs first so every
  // body's `world` pose matches the `local` pose the previous step's
  // integration wrote before the physics systems read it. Gravity and the
  // platform's own mover must run before collision resolution, so this
  // step's velocity changes are reflected in the solver; euler integration
  // runs last so it moves every body (dynamic crates and the kinematic
  // platform alike) from this step's resolved velocity.
  world.addSystem(createTransformEcsSystem(time), physics);
  world.addSystem(createGravityEcsSystem(time), physics);
  world.addSystem(createPlatformMoverEcsSystem(), physics);
  world.addSystem(createBroadPhaseEcsSystem(collisionPairs), physics);
  world.addSystem(
    createNarrowPhaseEcsSystem(collisionPairs, collisionManifolds),
    physics,
  );
  world.addSystem(
    createCollisionResolutionEcsSystem(
      collisionManifolds,
      contactConstraints,
      time,
    ),
    physics,
  );
  world.addSystem(createEulerIntegrationEcsSystem(time), physics);
  world.addSystem(createContinuousCollisionEcsSystem(), physics);
  world.addSystem(createTransformInterpolationEcsSystem(), physics);

  // Once per frame, after the fixed steps, so the frame draws the latest
  // step's poses.
  world.addSystem(createTransformEcsSystem(time));
  world.addSystem(createCameraEcsSystem(time));
  world.addSystem(createRenderEcsSystem(renderContext));

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
