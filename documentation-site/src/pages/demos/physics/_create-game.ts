import {
  addCamera,
  createCameraEcsSystem,
  createRenderEcsSystem,
  screenToWorldSpace,
} from '@forge-game-engine/forge/rendering';
import { createGame, Game } from '@forge-game-engine/forge/utilities';
import {
  createPhysicsEcsSystem,
  PhysicsWorld,
} from '@forge-game-engine/forge/physics';
import { Vector2 } from '@forge-game-engine/forge/math';
import { createBoundaries } from './_create-boundaries';
import { spawnShapes } from './_spawn-shapes';

const renderLayers = {
  foreground: 1 << 0,
};

const gravity = new Vector2(0, -300);
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

  addCamera(world, {
    isStatic: true,
    cullingMask: renderLayers.foreground,
  });

  const physicsWorld = new PhysicsWorld({ gravity });

  await createBoundaries(world, renderContext, renderLayers.foreground);
  await spawnShapes(world, renderContext, renderLayers.foreground);

  world.addSystem(createCameraEcsSystem(time));
  world.addSystem(createRenderEcsSystem(renderContext));
  world.addSystem(createPhysicsEcsSystem(physicsWorld, time));

  // The camera is static at the world origin with a zoom of 1 (see
  // `addCamera` above), so screen coordinates can be converted to world
  // coordinates directly.
  renderContext.canvas.addEventListener('mousedown', (event: MouseEvent) => {
    const canvasBounds = renderContext.canvas.getBoundingClientRect();

    const screenPosition = new Vector2(
      event.clientX - canvasBounds.left,
      event.clientY - canvasBounds.top,
    );

    const worldPosition = screenToWorldSpace(
      screenPosition,
      Vector2.zero,
      1,
      renderContext.canvas.width,
      renderContext.canvas.height,
    );

    physicsWorld.applyExplosiveForce(
      worldPosition,
      explosionForce,
      explosionRadius,
    );
  });

  return game;
};
