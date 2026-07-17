import {
  createCamera,
  createCameraEcsSystem,
  createRenderEcsSystem,
} from '@forge-game-engine/forge/rendering';
import { createGame, Game } from '@forge-game-engine/forge/utilities';
import {
  createPhysicsEcsSystem,
  PhysicsWorld,
} from '@forge-game-engine/forge/physics';
import { Random, Vector2 } from '@forge-game-engine/forge/math';
import {
  actionResetTypes,
  Axis1dAction,
  gamepadAxes,
  gamepadButtons,
  GamepadAxis1dBinding,
  GamepadInputSource,
  KeyboardAxis1dBinding,
  keyCodes,
  KeyboardInputSource,
  registerInputs,
} from '@forge-game-engine/forge/input';
import { createBoundaries } from './_create-boundaries';
import { createPaddle } from './_create-paddle';
import { createPaddleEcsSystem } from './_paddle.system';
import { createBall } from './_create-ball';
import { createBallEcsSystem } from './_ball.system';
import { createBrickField } from './_create-bricks';
import { createBrickEcsSystem } from './_brick.system';
import { createBackground } from './_create-background';
import { createBackgroundEcsSystem } from './_background.system';

const renderLayers = {
  background: 1 << 0,
  foreground: 1 << 1,
};

const ballStartOffset = 30;
const missMargin = 60;

export const createBrickBreakerGame = async (): Promise<Game> => {
  const { game, world, renderContext, time } = createGame('demo-game');

  // The background sits on its own static camera, added before the
  // foreground camera, so it always renders first and stays behind the
  // gameplay sprites.
  createCamera(world, {
    isStatic: true,
    cullingMask: renderLayers.background,
  });

  createCamera(world, {
    isStatic: true,
    cullingMask: renderLayers.foreground,
  });

  createBackground(world, renderContext, renderLayers.background);

  const moveInput = new Axis1dAction(
    'paddleMove',
    null,
    actionResetTypes.noReset,
  );

  const inputManager = registerInputs(world, time, {
    axis1dActions: [moveInput],
  });

  const keyboardInputSource = new KeyboardInputSource(inputManager);

  keyboardInputSource.axis1dBindings.add(
    new KeyboardAxis1dBinding(moveInput, keyCodes.d, keyCodes.a),
  );

  keyboardInputSource.axis1dBindings.add(
    new KeyboardAxis1dBinding(
      moveInput,
      keyCodes.arrowRight,
      keyCodes.arrowLeft,
    ),
  );

  const gamepadInputSource = new GamepadInputSource(inputManager, -1);

  gamepadInputSource.axis1dBindings.add(
    new GamepadAxis1dBinding(moveInput, { axisIndex: gamepadAxes.leftStickX }),
  );

  gamepadInputSource.axis1dBindings.add(
    new GamepadAxis1dBinding(moveInput, {
      positiveButtonIndex: gamepadButtons.dpadRight,
      negativeButtonIndex: gamepadButtons.dpadLeft,
    }),
  );

  const playArea = await createBoundaries(
    world,
    renderContext,
    renderLayers.foreground,
  );

  const paddlePosition = await createPaddle(
    world,
    renderContext,
    renderLayers.foreground,
    playArea,
  );

  const random = new Random();
  const playAreaWidth = playArea.maxX - playArea.minX;

  const ballStartPosition = new Vector2(
    paddlePosition.x,
    paddlePosition.y + ballStartOffset,
  );

  await createBall(
    world,
    renderContext,
    renderLayers.foreground,
    ballStartPosition,
    playAreaWidth,
    random,
  );

  const brickField = await createBrickField(
    world,
    renderContext,
    renderLayers.foreground,
    playArea,
  );

  const physicsWorld = new PhysicsWorld();
  const missY = playArea.bottomY - missMargin;

  world.addSystem(createCameraEcsSystem(time));
  world.addSystem(createRenderEcsSystem(renderContext));
  world.addSystem(createBackgroundEcsSystem(time));
  world.addSystem(createPaddleEcsSystem(moveInput, time));
  world.addSystem(createBrickEcsSystem(time));
  world.addSystem(createPhysicsEcsSystem(physicsWorld, time));
  world.addSystem(createBallEcsSystem(physicsWorld, random, missY, brickField));

  return game;
};
