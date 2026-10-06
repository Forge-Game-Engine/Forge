import {
  createCamera,
  createCameraEcsSystem,
  createRenderEcsSystem,
  getCameraView,
} from '@forge-game-engine/forge/rendering';
import { createGame, Game } from '@forge-game-engine/forge/utilities';
import { createTransformEcsSystem } from '@forge-game-engine/forge/common';
import {
  CollisionPair,
  createBroadPhaseEcsSystem,
  raycast,
} from '@forge-game-engine/forge/physics';
import { Vec2 } from '@forge-game-engine/forge/math';
import { DEMO_VERTICAL_WORLD_UNITS } from '@site/src/utils/demo-camera';
import { createTargets } from './_create-targets';
import { createRayVisual, updateRayVisual } from './_ray-visual';

const renderLayers = {
  foreground: 1 << 0,
};

// Long enough to always reach past the edge of the visible area, in either
// direction, from the fixed origin near the left edge.
const rayMaxLength = 2000;

export const createRaycastingGame = async (): Promise<Game> => {
  const { game, world, renderContext, time } = createGame('demo-game');

  const camera = createCamera(world, {
    isStatic: true,
    cullingMask: renderLayers.foreground,
    verticalWorldUnits: DEMO_VERTICAL_WORLD_UNITS,
  });

  await createTargets(world, camera, renderContext, renderLayers.foreground);

  const { x: width } = getCameraView(world, camera, renderContext).size;
  const rayOrigin = { x: -width / 2 + 40, y: 0 };

  const rayVisual = await createRayVisual(
    world,
    renderContext,
    renderLayers.foreground,
  );

  updateRayVisual(
    rayVisual,
    rayOrigin,
    { x: rayOrigin.x + rayMaxLength, y: rayOrigin.y },
    null,
  );

  const collisionPairs: CollisionPair[] = [];

  // `raycast` reads each entity's `AabbEcsComponent` directly rather than
  // recomputing it, so the broad-phase system still needs to run every
  // tick to keep it in sync - even though nothing in this scene has a
  // `RigidBodyEcsComponent` for it to actually resolve collisions between.
  // `createTransformEcsSystem` runs first so the targets' `world` poses (which
  // the broad phase and `raycast` read) and the ray visual's `world` pose
  // (which `updateRayVisual` writes as `local` from the mouse handler below)
  // are up to date before the broad-phase and render systems read them.
  world.addSystem(createTransformEcsSystem());
  world.addSystem(createBroadPhaseEcsSystem(collisionPairs));
  world.addSystem(createCameraEcsSystem(time));
  world.addSystem(createRenderEcsSystem(renderContext));

  renderContext.canvas.addEventListener('mousemove', (event: MouseEvent) => {
    const canvasBounds = renderContext.canvas.getBoundingClientRect();

    const screenPosition = {
      x: event.clientX - canvasBounds.left,
      y: event.clientY - canvasBounds.top,
    };

    const mouseWorldPosition = getCameraView(
      world,
      camera,
      renderContext,
    ).viewportToWorld(screenPosition);

    // Clone before subtracting: `mouseWorldPosition` is a fresh point every
    // event, `rayOrigin` is reused every event.
    const toMouse = Vec2.subtract(Vec2.clone(mouseWorldPosition), rayOrigin);
    const distanceToMouse = Vec2.magnitude(toMouse);
    const direction =
      distanceToMouse === 0
        ? Vec2.right
        : Vec2.divide(toMouse, distanceToMouse);
    const rayEnd = Vec2.add(Vec2.multiply(direction, rayMaxLength), rayOrigin);

    const hits = raycast(world, rayOrigin, rayEnd);
    const closest = hits[0] ?? null;

    updateRayVisual(
      rayVisual,
      rayOrigin,
      closest ? closest.point : rayEnd,
      closest ? closest.point : null,
    );
  });

  return game;
};
