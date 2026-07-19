import {
  createCamera,
  createCameraEcsSystem,
  createRenderEcsSystem,
} from '@forge-game-engine/forge/rendering';
import { createGame, Game } from '@forge-game-engine/forge/utilities';
import {
  createAngularVelocityMotorEcsSystem,
  createAppliedTorqueEcsSystem,
  createPhysicsEcsSystem,
  PhysicsWorld,
} from '@forge-game-engine/forge/physics';
import {
  HoldAction,
  keyCodes,
  KeyboardHoldBinding,
  KeyboardInputSource,
  registerInputs,
} from '@forge-game-engine/forge/input';
import { Vector2 } from '@forge-game-engine/forge/math';
import {
  createMotorScenario,
  createThrusterScenario,
} from './_create-flywheels';
import { createThrusterEcsSystem } from './_thruster.system';
import { createGustEcsSystem } from './_gust.system';

const renderLayers = {
  foreground: 1 << 0,
};

export const createTorqueGame = async (): Promise<Game> => {
  const { game, world, renderContext, time } = createGame('demo-game');

  createCamera(world, {
    isStatic: true,
    cullingMask: renderLayers.foreground,
  });

  // No gravity: these flywheels only ever spin in place, so nothing needs
  // to pull them downward.
  const physicsWorld = new PhysicsWorld({ gravity: Vector2.zero });

  const thrustInput = new HoldAction('thrust');
  const inputManager = registerInputs(world, time, {
    holdActions: [thrustInput],
  });
  const keyboardInputSource = new KeyboardInputSource(inputManager);

  keyboardInputSource.holdBindings.add(
    new KeyboardHoldBinding(thrustInput, keyCodes.space),
  );

  const { width, height } = renderContext.canvas;
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

  // `createThrusterEcsSystem` and `createGustEcsSystem` set
  // `AppliedTorqueEcsComponent.value`/`RigidBody.angularVelocity` for this
  // tick, so they must run before `createAppliedTorqueEcsSystem`/
  // `createAngularVelocityMotorEcsSystem`, which in turn must run before
  // `createPhysicsEcsSystem`, which is what steps `physicsWorld` (see the
  // Applying Forces guide's registration-order caution).
  world.addSystem(createThrusterEcsSystem());
  world.addSystem(createGustEcsSystem(time));
  world.addSystem(createAppliedTorqueEcsSystem(time));
  world.addSystem(createAngularVelocityMotorEcsSystem(time));
  world.addSystem(createCameraEcsSystem(time));
  world.addSystem(createRenderEcsSystem(renderContext));
  world.addSystem(createPhysicsEcsSystem(physicsWorld, time));

  return game;
};
