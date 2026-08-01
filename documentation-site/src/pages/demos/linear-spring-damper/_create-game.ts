import {
  createCamera,
  createCameraEcsSystem,
  createRenderEcsSystem,
} from '@forge-game-engine/forge/rendering';
import { createGame, Game } from '@forge-game-engine/forge/utilities';
import {
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

  createCamera(world, {
    isStatic: true,
    cullingMask: renderLayers.foreground,
    verticalWorldUnits: DEMO_VERTICAL_WORLD_UNITS,
  });

  await createSuspensions(world, renderContext, renderLayers.foreground);

  // A reset (teleport) must run before gravity/spring/damper so a replayed
  // disturbance is reflected in this same tick's forces.
  // `createSpringLineEcsSystem` only needs to run before
  // `createRenderEcsSystem`, so its updated line is reflected in this
  // tick's render.
  world.addSystem(createResetEcsSystem(time));
  world.addSystem(createGravityEcsSystem(time));
  world.addSystem(createLinearSpringEcsSystem(time));
  world.addSystem(createLinearDamperEcsSystem(time));
  world.addSystem(createSpringLineEcsSystem());
  world.addSystem(createCameraEcsSystem(time));
  world.addSystem(createRenderEcsSystem(renderContext));
  world.addSystem(createEulerIntegrationEcsSystem(time));

  return game;
};
