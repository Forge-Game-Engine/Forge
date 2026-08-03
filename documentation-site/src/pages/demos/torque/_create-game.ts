import {
  calculateVisibleWorldSize,
  createCamera,
  createCameraEcsSystem,
  createRenderEcsSystem,
} from '@forge-game-engine/forge/rendering';
import { createGame, Game } from '@forge-game-engine/forge/utilities';
import {
  createAngularVelocityMotorEcsSystem,
  createEulerIntegrationEcsSystem,
} from '@forge-game-engine/forge/physics';
import {
  HoldAction,
  KeyboardHoldBinding,
  KeyboardInputSource,
  keyCodes,
  registerInputs,
} from '@forge-game-engine/forge/input';
import { Vector2 } from '@forge-game-engine/forge/math';
import {
  createMotorScenario,
  createThrusterScenario,
} from './_create-flywheels';
import { createThrusterEcsSystem } from './_thruster.system';
import { createGustEcsSystem } from './_gust.system';
import { DEMO_VERTICAL_WORLD_UNITS } from '@site/src/utils/demo-camera';

const renderLayers = {
  foreground: 1 << 0,
};

export const createTorqueGame = async (): Promise<Game> => {
  const { game, world, renderContext, time } = createGame('demo-game');

  createCamera(world, {
    isStatic: true,
    cullingMask: renderLayers.foreground,
    verticalWorldUnits: DEMO_VERTICAL_WORLD_UNITS,
  });

  // No gravity system is registered: these flywheels only ever spin in
  // place, so nothing needs to pull them downward.
  const thrustInput = new HoldAction('thrust');
  const inputManager = registerInputs(world, time, {
    holdActions: [thrustInput],
  });
  const keyboardInputSource = new KeyboardInputSource(inputManager);

  keyboardInputSource.holdBindings.add(
    new KeyboardHoldBinding(thrustInput, keyCodes.space),
  );

  const { x: width, y: height } = calculateVisibleWorldSize(
    renderContext.width,
    renderContext.height,
    DEMO_VERTICAL_WORLD_UNITS,
  );
  const columnWidth = width / 2;

  await createThrusterScenario(
    world,
    renderContext,
    renderLayers.foreground,
    new Vector2(-columnWidth / 2, height * 0.1),
    thrustInput,
  );

  await createMotorScenario(
    world,
    renderContext,
    renderLayers.foreground,
    new Vector2(columnWidth / 2, height * 0.1),
  );

  // `createThrusterEcsSystem` and `createGustEcsSystem` change
  // `RigidBodyEcsComponent.angularVelocity` directly for this tick, and
  // `createAngularVelocityMotorEcsSystem` reads/corrects it, so all three
  // must run before whatever system integrates velocity into position
  // (`createEulerIntegrationEcsSystem`).
  world.addSystem(createThrusterEcsSystem(time));
  world.addSystem(createGustEcsSystem(time));
  world.addSystem(createAngularVelocityMotorEcsSystem(time));
  world.addSystem(createCameraEcsSystem(time));
  world.addSystem(createRenderEcsSystem(renderContext));
  world.addSystem(createEulerIntegrationEcsSystem(time));

  return game;
};
