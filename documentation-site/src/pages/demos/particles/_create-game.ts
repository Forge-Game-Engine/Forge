import {
  calculatePixelsPerUnit,
  createCamera,
  createCameraEcsSystem,
  createRenderEcsSystem,
  screenToWorldSpace,
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
import {
  createVector2,
  Random,
  Vector2,
  vector2Zero,
} from '@forge-game-engine/forge/math';
import {
  createParticleEcsSystem,
  createParticlePositionEcsSystem,
} from '@forge-game-engine/forge/particles';
import { DEMO_VERTICAL_WORLD_UNITS } from '@site/src/utils/demo-camera';
import { createAmbientEmitterEcsSystem } from './_ambient-emitter.system';
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

  createCamera(world, {
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

  const fountainPosition = createVector2(
    0,
    -DEMO_VERTICAL_WORLD_UNITS / 2 + fountainHeightFromBottom,
  );

  await createEmberFountain(
    world,
    renderContext,
    renderLayers.foreground,
    fountainPosition,
  );

  world.addSystem(createAmbientEmitterEcsSystem());
  world.addSystem(createParticleEcsSystem(time, random));
  world.addSystem(createParticlePositionEcsSystem(time));
  world.addSystem(createLifetimeTrackingEcsSystem(time));
  world.addSystem(createAgeScaleEcsSystem());
  world.addSystem(createRemoveFromWorldEcsSystem());
  // Particles only update their local transform, so the transform system
  // needs to run before the camera/render systems to resolve it to the world
  // transform the renderer reads.
  world.addSystem(createTransformEcsSystem());
  world.addSystem(createCameraEcsSystem(time));
  world.addSystem(createRenderEcsSystem(renderContext));

  // The camera is static at the world origin with a zoom of 1 (see
  // `createCamera` above), so screen coordinates can be converted to world
  // coordinates directly, once scaled by the camera's pixels-per-unit.
  const toWorldPosition = (event: MouseEvent): Vector2 => {
    const canvasBounds = renderContext.canvas.getBoundingClientRect();

    const screenPosition = createVector2(
      event.clientX - canvasBounds.left,
      event.clientY - canvasBounds.top,
    );

    const pixelsPerUnit = calculatePixelsPerUnit(
      renderContext.height,
      DEMO_VERTICAL_WORLD_UNITS,
    );

    return screenToWorldSpace(
      screenPosition,
      vector2Zero(),
      1,
      renderContext.width,
      renderContext.height,
      pixelsPerUnit,
    );
  };

  let isDragging = false;

  renderContext.canvas.addEventListener('mousedown', (event: MouseEvent) => {
    isDragging = true;
    cursorEffects.setCursorPosition(toWorldPosition(event));
    cursorEffects.triggerSparkBurst();
  });

  renderContext.canvas.addEventListener('mousemove', (event: MouseEvent) => {
    if (!isDragging) {
      return;
    }

    cursorEffects.setCursorPosition(toWorldPosition(event));
    cursorEffects.continueSmokeTrail();
  });

  const stopDragging = (): void => {
    isDragging = false;
  };

  renderContext.canvas.addEventListener('mouseup', stopDragging);
  renderContext.canvas.addEventListener('mouseleave', stopDragging);

  return game;
};
