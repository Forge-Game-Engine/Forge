import {
  createCamera,
  createCameraEcsSystem,
  createRenderEcsSystem,
} from '@forge-game-engine/forge/rendering';
import { createGame, Game } from '@forge-game-engine/forge/utilities';
import { createTransformEcsSystem } from '@forge-game-engine/forge/common';
import {
  createContinuousCollisionEcsSystem,
  createEulerIntegrationEcsSystem,
  createGravityEcsSystem,
  createLinearDamperEcsSystem,
  createLinearSpringEcsSystem,
} from '@forge-game-engine/forge/physics';
import { DEMO_VERTICAL_WORLD_UNITS } from '@site/src/utils/demo-camera';
import { createSuspensions } from './_create-suspensions';
import { createResetEcsSystem } from './_reset.system';
import { createSpringLineEcsSystem } from './_spring-line.system';

const renderLayers = {
  foreground: 1 << 0,
};

export const createLinearSpringDamperGame = async (): Promise<Game> => {
  const { game, world, renderContext, time } = createGame('demo-game');

  const camera = createCamera(world, {
    isStatic: true,
    cullingMask: renderLayers.foreground,
    verticalWorldUnits: DEMO_VERTICAL_WORLD_UNITS,
  });

  await createSuspensions(
    world,
    camera,
    renderContext,
    renderLayers.foreground,
  );

  // A reset (teleport) and `createSpringLineEcsSystem` both write `local`
  // positions, so they run before `createTransformEcsSystem`, which turns
  // every entity's `local` position into the `world` position that the
  // spring/damper and render systems read. That way a replayed disturbance
  // is reflected in this same tick's forces, and the line spans the body's
  // position in this tick's render.
  world.addSystem(createResetEcsSystem(time));
  world.addSystem(createSpringLineEcsSystem());
  world.addSystem(createTransformEcsSystem());
  world.addSystem(createGravityEcsSystem(time));
  world.addSystem(createLinearSpringEcsSystem(time));
  world.addSystem(createLinearDamperEcsSystem(time));
  world.addSystem(createCameraEcsSystem(time));
  world.addSystem(createRenderEcsSystem(renderContext));
  world.addSystem(createEulerIntegrationEcsSystem(time));
  world.addSystem(createContinuousCollisionEcsSystem());

  return game;
};
