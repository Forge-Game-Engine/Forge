import {
  addCamera,
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
import { Random, Vector2 } from '@forge-game-engine/forge/math';
import {
  createParticleEcsSystem,
  createParticlePositionEcsSystem,
} from '@forge-game-engine/forge/particles';
import { createAmbientEmitterEcsSystem } from './_ambient-emitter.system';
import { createCursorEffects } from './_create-cursor-effects';
import { createEmberFountain } from './_create-ember-fountain';

const renderLayers = {
  foreground: 1 << 0,
};

// Fraction of the canvas height up from the bottom edge that the ember
// fountain sits at, so it stays in view regardless of canvas size.
const fountainHeightFraction = 0.12;

export const createParticlesGame = async (): Promise<Game> => {
  const { game, world, renderContext, time } = createGame('demo-game');

  addCamera(world, {
    isStatic: true,
    cullingMask: renderLayers.foreground,
  });

  const random = new Random();

  const cursorEffects = await createCursorEffects(
    world,
    renderContext,
    renderLayers.foreground,
  );

  const fountainPosition = new Vector2(
    0,
    -renderContext.canvas.height / 2 +
      renderContext.canvas.height * fountainHeightFraction,
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
  // `addCamera` above), so screen coordinates can be converted to world
  // coordinates directly.
  const toWorldPosition = (event: MouseEvent): Vector2 => {
    const canvasBounds = renderContext.canvas.getBoundingClientRect();

    const screenPosition = new Vector2(
      event.clientX - canvasBounds.left,
      event.clientY - canvasBounds.top,
    );

    return screenToWorldSpace(
      screenPosition,
      Vector2.zero,
      1,
      renderContext.canvas.width,
      renderContext.canvas.height,
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
