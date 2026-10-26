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
  applyExplosiveForce,
  CollisionManifold,
  CollisionPair,
  ContactConstraint,
  createBroadPhase,
  createBroadPhaseEcsSystem,
  createCollisionResolutionEcsSystem,
  createContinuousCollisionEcsSystem,
  createEulerIntegrationEcsSystem,
  createGravityEcsSystem,
  createNarrowPhaseEcsSystem,
  createSleepEcsSystem,
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

// The sleep system's default resting speed, 0.01 units a second, is
// Box2D's, which assumes a world measured in meters with bodies about a unit
// across. Outside fullscreen a world unit here is a CSS pixel (see
// DEMO_VERTICAL_WORLD_UNITS) and the shapes are 30-60 units across, so the
// default would only count a shape as resting below a hundredth of a pixel
// a second, and a shape still creeping too slowly to see would keep the
// whole pile awake. It's scaled as if a meter were 40 units.
const pixelsPerMeter = 40;
const maxRestingSpeed = 0.01 * pixelsPerMeter;

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
  // the `world` pose the physics systems read. The sleep system runs after
  // the narrow phase, so it reads this step's contacts, and before gravity
  // and every other system that changes velocity, so a resting shape isn't
  // given this step's gravity before it's checked for rest. Settled shapes
  // then fall asleep and the physics systems skip them.
  world.addSystem(createTransformEcsSystem(time), physics);
  createBroadPhase(world);
  world.addSystem(createBroadPhaseEcsSystem(collisionPairs), physics);
  world.addSystem(
    createNarrowPhaseEcsSystem(collisionPairs, collisionManifolds),
    physics,
  );
  world.addSystem(
    createSleepEcsSystem(collisionManifolds, time, { maxRestingSpeed }),
    physics,
  );
  world.addSystem(createGravityEcsSystem(time), physics);
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
  // Last in the step: records where each body ended it.
  world.addSystem(createTransformInterpolationEcsSystem(), physics);

  // Once per frame, after the fixed steps. The transform system draws each
  // body between where it started and ended the latest step, by how far the
  // frame is towards the next one.
  world.addSystem(createTransformEcsSystem(time));
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
