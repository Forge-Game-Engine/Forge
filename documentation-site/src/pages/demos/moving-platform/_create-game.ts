import {
  calculatePixelsPerUnit,
  calculateVisibleWorldSize,
  createCamera,
  createCameraEcsSystem,
  createRenderEcsSystem,
  screenToWorldSpace,
} from '@forge-game-engine/forge/rendering';
import { createGame, Game } from '@forge-game-engine/forge/utilities';
import {
  CollisionManifold,
  CollisionPair,
  ContactConstraint,
  createBroadPhaseEcsSystem,
  createCollisionResolutionEcsSystem,
  createEulerIntegrationEcsSystem,
  createGravityEcsSystem,
  createNarrowPhaseEcsSystem,
} from '@forge-game-engine/forge/physics';
import { Vec2 } from '@forge-game-engine/forge/math';
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

  createCamera(world, {
    isStatic: true,
    cullingMask: renderLayers.foreground,
    verticalWorldUnits: DEMO_VERTICAL_WORLD_UNITS,
  });

  const { x: width, y: height } = calculateVisibleWorldSize(
    renderContext.width,
    renderContext.height,
    DEMO_VERTICAL_WORLD_UNITS,
  );
  const platformY = -height * 0.15;
  const leftX = -width * 0.25;
  const rightX = width * 0.25;

  await createBoundaries(world, renderContext, renderLayers.foreground);
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

  // Gravity and the platform's own mover must run before collision
  // resolution, so this tick's velocity changes are reflected in the
  // solver; euler integration runs last so it moves every body (dynamic
  // crates and the kinematic platform alike) from this tick's resolved
  // velocity.
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

  // Click anywhere to drop another crate at that position - the camera is
  // static at the world origin with a zoom of 1 (see `createCamera` above),
  // so screen coordinates can be converted to world coordinates directly,
  // once scaled by the camera's pixels-per-unit.
  renderContext.canvas.addEventListener('mousedown', (event: MouseEvent) => {
    const canvasBounds = renderContext.canvas.getBoundingClientRect();

    const screenPosition = {
      x: event.clientX - canvasBounds.left,
      y: event.clientY - canvasBounds.top,
    };

    const pixelsPerUnit = calculatePixelsPerUnit(
      renderContext.height,
      DEMO_VERTICAL_WORLD_UNITS,
    );

    const worldPosition = screenToWorldSpace(
      screenPosition,
      Vec2.zero,
      1,
      renderContext.width,
      renderContext.height,
      pixelsPerUnit,
    );

    spawnCrate(world, crateSprite, worldPosition);
  });

  return game;
};
