import {
  Color,
  createCamera,
  createCameraEcsSystem,
  createRenderEcsSystem,
  getCameraView,
  SpriteEcsComponent,
  spriteId,
} from '@forge-game-engine/forge/rendering';
import { createGame, Game } from '@forge-game-engine/forge/utilities';
import {
  createTransformEcsSystem,
  registerFixedUpdate,
} from '@forge-game-engine/forge/common';
import {
  CollisionPair,
  createBroadPhase,
  createBroadPhaseEcsSystem,
  overlapPoint,
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

// Multiplies the hovered target's texture, so it turns a warm amber.
const hoverTint = new Color(1, 0.75, 0.35, 1);

export const createRaycastingGame = async (): Promise<Game> => {
  const { game, world, renderContext, time } = createGame('demo-game');

  const camera = createCamera(world, {
    isStatic: true,
    cullingMask: renderLayers.foreground,
    verticalWorldUnits: DEMO_VERTICAL_WORLD_UNITS,
  });

  const targets = await createTargets(
    world,
    camera,
    renderContext,
    renderLayers.foreground,
  );

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

  const fixedUpdate = registerFixedUpdate(world, time);
  const physics = { group: fixedUpdate };

  // `raycast` and `overlapPoint` search the broad phase's trees and test
  // each nearby collider's `aabb`, so the broad-phase system still needs to
  // run every fixed step to keep them in sync - even though nothing in this
  // scene has a `RigidBodyEcsComponent` for it to actually resolve
  // collisions between. A query sees the colliders as of the last fixed
  // step. The fixed step's `createTransformEcsSystem` runs first so the
  // targets' `world` poses, which the broad phase reads, are up to date.
  world.addSystem(createTransformEcsSystem(time), physics);
  createBroadPhase(world);
  world.addSystem(createBroadPhaseEcsSystem(collisionPairs), physics);

  // Once per frame, after the fixed steps, so the ray visual's `world` pose
  // (which `updateRayVisual` writes as `local` from the mouse handler below)
  // is up to date before the render system reads it.
  world.addSystem(createTransformEcsSystem(time));
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

    // `overlapPoint` tests each collider's exact shape, so the cursor in a
    // circle's bounding-square corner, outside the circle, tints nothing.
    const hovered = overlapPoint(world, mouseWorldPosition);

    for (const target of targets) {
      const sprite = world.getComponentRequired<SpriteEcsComponent>(
        target,
        spriteId,
      );

      sprite.tintColor = hovered.includes(target) ? hoverTint : Color.white;
    }
  });

  return game;
};
