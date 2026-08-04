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

  createCamera(world, {
    isStatic: true,
    cullingMask: renderLayers.foreground,
    verticalWorldUnits: DEMO_VERTICAL_WORLD_UNITS,
  });

  await createTargets(world, renderContext, renderLayers.foreground);

  const { x: width } = calculateVisibleWorldSize(
    renderContext.width,
    renderContext.height,
    DEMO_VERTICAL_WORLD_UNITS,
  );
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
  world.addSystem(createBroadPhaseEcsSystem(collisionPairs));
  world.addSystem(createCameraEcsSystem(time));
  world.addSystem(createRenderEcsSystem(renderContext));

  // The camera is static at the world origin with a zoom of 1 (see
  // `createCamera` above), so screen coordinates can be converted to world
  // coordinates directly, once scaled by the camera's pixels-per-unit.
  renderContext.canvas.addEventListener('mousemove', (event: MouseEvent) => {
    const canvasBounds = renderContext.canvas.getBoundingClientRect();

    const screenPosition = {
      x: event.clientX - canvasBounds.left,
      y: event.clientY - canvasBounds.top,
    };

    const pixelsPerUnit = calculatePixelsPerUnit(
      renderContext.height,
      DEMO_VERTICAL_WORLD_UNITS,
    );

    const mouseWorldPosition = screenToWorldSpace(
      screenPosition,
      Vec2.zero,
      1,
      renderContext.width,
      renderContext.height,
      pixelsPerUnit,
    );

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
