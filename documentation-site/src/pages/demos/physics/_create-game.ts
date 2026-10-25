import {
  createCamera,
  createCameraEcsSystem,
  createRenderEcsSystem,
  getCameraView,
} from '@forge-game-engine/forge/rendering';
import { createGame, Game } from '@forge-game-engine/forge/utilities';
import {
  createTransformEcsSystem,
  registerFixedUpdate,
} from '@forge-game-engine/forge/common';
import {
  applyExplosiveForce,
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

  const camera = createCamera(world, {
    isStatic: true,
    cullingMask: renderLayers.foreground,
    verticalWorldUnits: DEMO_VERTICAL_WORLD_UNITS,
  });

  await createBoundaries(world, camera, renderContext, renderLayers.foreground);
  await spawnShapes(world, camera, renderContext, renderLayers.foreground);

  const collisionPairs: CollisionPair[] = [];
  const collisionManifolds: CollisionManifold[] = [];
  const contactConstraints: ContactConstraint[] = [];

  const fixedUpdate = registerFixedUpdate(world, time);
  const physics = { group: fixedUpdate };

  // Once per fixed step. The transform system runs first, turning each
  // body's `local` pose (which the previous step's integration moved) into
  // the `world` pose the physics systems read.
  world.addSystem(createTransformEcsSystem(), physics);
  world.addSystem(createGravityEcsSystem(time), physics);
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

  // Once per frame, after the fixed steps, so the frame draws the latest
  // step's poses.
  world.addSystem(createTransformEcsSystem());
  world.addSystem(createCameraEcsSystem(time));
  world.addSystem(createRenderEcsSystem(renderContext));

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

    applyExplosiveForce(world, worldPosition, explosionForce, explosionRadius);
  });

  return game;
};
