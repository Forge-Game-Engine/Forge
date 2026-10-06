import {
  createCamera,
  createCameraEcsSystem,
  createRenderEcsSystem,
  getCameraView,
} from '@forge-game-engine/forge/rendering';
import { createGame, Game } from '@forge-game-engine/forge/utilities';
import {
  createAgeScaleEcsSystem,
  createTransformEcsSystem,
} from '@forge-game-engine/forge/common';
import {
  createLifetimeTrackingEcsSystem,
  createRemoveFromWorldEcsSystem,
} from '@forge-game-engine/forge/lifecycle';
import { Random, Vector2 } from '@forge-game-engine/forge/math';
import {
  createParticleEcsSystem,
  createParticleOpacityEcsSystem,
  createParticlePositionEcsSystem,
} from '@forge-game-engine/forge/particles';
import { DEMO_VERTICAL_WORLD_UNITS } from '@site/src/utils/demo-camera';
import { createCursorEffects } from './_create-cursor-effects';
import { createEmberFountain } from './_create-ember-fountain';

const renderLayers = {
  foreground: 1 << 0,
};

// Height, in world units, up from the bottom edge of the camera's fixed
// vertical world units that the ember fountain sits at, so it stays in view
// regardless of resolution or aspect ratio.
const fountainHeightFromBottom = DEMO_VERTICAL_WORLD_UNITS * 0.12;

export const createParticlesGame = async (): Promise<Game> => {
  const { game, world, renderContext, time } = createGame('demo-game');

  const camera = createCamera(world, {
    isStatic: true,
    cullingMask: renderLayers.foreground,
    verticalWorldUnits: DEMO_VERTICAL_WORLD_UNITS,
  });

  const random = new Random();

  const cursorEffects = await createCursorEffects(
    world,
    renderContext,
    renderLayers.foreground,
  );

  const fountainPosition = {
    x: 0,
    y: -DEMO_VERTICAL_WORLD_UNITS / 2 + fountainHeightFromBottom,
  };

  await createEmberFountain(
    world,
    renderContext,
    renderLayers.foreground,
    fountainPosition,
  );

  world.addSystem(createParticleEcsSystem(time, random));
  world.addSystem(createParticlePositionEcsSystem(time));
  world.addSystem(createLifetimeTrackingEcsSystem(time));
  world.addSystem(createAgeScaleEcsSystem());
  world.addSystem(createParticleOpacityEcsSystem());
  world.addSystem(createRemoveFromWorldEcsSystem());
  world.addSystem(createCameraEcsSystem(time));
  // Particles (like every entity) only update their local transform, so the
  // transform system runs after every system above and before the render
  // system, resolving it to the world transform the renderer reads.
  world.addSystem(createTransformEcsSystem());
  world.addSystem(createRenderEcsSystem(renderContext));

  const toWorldPosition = (event: MouseEvent): Vector2 => {
    const canvasBounds = renderContext.canvas.getBoundingClientRect();

    const screenPosition = {
      x: event.clientX - canvasBounds.left,
      y: event.clientY - canvasBounds.top,
    };

    return getCameraView(world, camera, renderContext).viewportToWorld(
      screenPosition,
    );
  };

  let isDragging = false;

  renderContext.canvas.addEventListener('mousedown', (event: MouseEvent) => {
    isDragging = true;
    cursorEffects.setCursorPosition(toWorldPosition(event));
    cursorEffects.triggerSparkBurst();
    cursorEffects.setSmokeTrail(true);
  });

  renderContext.canvas.addEventListener('mousemove', (event: MouseEvent) => {
    if (!isDragging) {
      return;
    }

    cursorEffects.setCursorPosition(toWorldPosition(event));
  });

  const stopDragging = (): void => {
    isDragging = false;
    cursorEffects.setSmokeTrail(false);
  };

  renderContext.canvas.addEventListener('mouseup', stopDragging);
  renderContext.canvas.addEventListener('mouseleave', stopDragging);

  return game;
};
