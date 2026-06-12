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
const explosionForce = 8_000_000;
const explosionRadius = 200;

export const createPhysicsGame = async (): Promise<Game> => {
  const { game, world, renderContext, time } = createGame('demo-game');

  addCamera(world, {
    isStatic: true,
    layerMask: renderLayers.foreground,
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
