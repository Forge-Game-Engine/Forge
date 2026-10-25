import {
  createCamera,
  createCameraEcsSystem,
  createRenderEcsSystem,
} from '@forge-game-engine/forge/rendering';
import { createGame, Game } from '@forge-game-engine/forge/utilities';
import {
  createTransformEcsSystem,
  registerFixedUpdate,
} from '@forge-game-engine/forge/common';
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

  const fixedUpdate = registerFixedUpdate(world, time);
  const physics = { group: fixedUpdate };

  // Once per fixed step. A reset (teleport) writes `local` positions, so it
  // runs before `createTransformEcsSystem`, which turns every entity's
  // `local` position into the `world` position that the spring/damper
  // systems read. That way a replayed disturbance is reflected in this same
  // step's forces.
  world.addSystem(createResetEcsSystem(time), physics);
  world.addSystem(createTransformEcsSystem(), physics);
  world.addSystem(createGravityEcsSystem(time), physics);
  world.addSystem(createLinearSpringEcsSystem(time), physics);
  world.addSystem(createLinearDamperEcsSystem(time), physics);
  world.addSystem(createEulerIntegrationEcsSystem(time), physics);

  // Once per frame, after the fixed steps. `createSpringLineEcsSystem`
  // writes each line's `local` position from the body's latest position, so
  // it runs before the transform system, and the line spans the body in
  // this frame's render.
  world.addSystem(createSpringLineEcsSystem());
  world.addSystem(createTransformEcsSystem());
  world.addSystem(createCameraEcsSystem(time));
  world.addSystem(createRenderEcsSystem(renderContext));

  return game;
};
