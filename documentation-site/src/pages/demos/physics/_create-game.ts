import {
  calculatePixelsPerUnit,
  createCamera,
  createCameraEcsSystem,
  createRenderEcsSystem,
  screenToWorldSpace,
} from '@forge-game-engine/forge/rendering';
import { createGame, Game } from '@forge-game-engine/forge/utilities';
import {
  applyExplosiveForce,
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
import { spawnShapes } from './_spawn-shapes';

const renderLayers = {
  foreground: 1 << 0,
};

// Kept low enough that even the lightest shape (the narrow plank, ~225 mass)
// hit dead-center stays under ~2,400px/s - the speed at which a body can
// cross the 40px-thick boundary walls in a single physics step and tunnel
// through them. That failure was more likely to surface in fullscreen, where
// shapes have more open space to build up speed before reaching a wall,
// making the explosion look far stronger than in the windowed view.
const explosionForce = 1_000_000;
const explosionRadius = 600;

export const createPhysicsGame = async (): Promise<Game> => {
  const { game, world, renderContext, time } = createGame('demo-game');

  createCamera(world, {
    isStatic: true,
    cullingMask: renderLayers.foreground,
    verticalWorldUnits: DEMO_VERTICAL_WORLD_UNITS,
  });

  await createBoundaries(world, renderContext, renderLayers.foreground);
  await spawnShapes(world, renderContext, renderLayers.foreground);

  const collisionPairs: CollisionPair[] = [];
  const collisionManifolds: CollisionManifold[] = [];
  const contactConstraints: ContactConstraint[] = [];

  world.addSystem(createGravityEcsSystem(time));
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

  // The camera is static at the world origin with a zoom of 1 (see
  // `createCamera` above), so screen coordinates can be converted to world
  // coordinates directly, once scaled by the camera's pixels-per-unit.
  renderContext.canvas.addEventListener('mousedown', (event: MouseEvent) => {
    const canvasBounds = renderContext.canvas.getBoundingClientRect();

    const screenPosition = { x: event.clientX - canvasBounds.left, y: event.clientY - canvasBounds.top };

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

    applyExplosiveForce(
      world,
      worldPosition,
      explosionForce,
      explosionRadius,
    );
  });

  return game;
};
