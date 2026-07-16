import {
  createCamera,
  createCameraEcsSystem,
  createRenderEcsSystem,
} from '@forge-game-engine/forge/rendering';
import { createGame, Game } from '@forge-game-engine/forge/utilities';
import { SystemRegistrationOrder } from '@forge-game-engine/forge/ecs';
import {
  createPhysicsEcsSystem,
  createWheelMotorEcsSystem,
  PhysicsWorld,
} from '@forge-game-engine/forge/physics';
import { Vector2 } from '@forge-game-engine/forge/math';
import {
  actionResetTypes,
  Axis1dAction,
  gamepadAxes,
  GamepadAxis1dBinding,
  GamepadInputSource,
  KeyboardAxis1dBinding,
  keyCodes,
  KeyboardInputSource,
  registerInputs,
} from '@forge-game-engine/forge/input';
import { createTerrain, terrainThickness } from './_create-terrain';
import {
  chassisSpriteRenderOffset,
  createVehicle,
  suspensionRestLength,
  wheelOffsetX,
  wheelRadius,
} from './_create-vehicle';
import { createVehicleControlEcsSystem } from './_vehicle-control.system';
import { createCameraFollowEcsSystem } from './_camera-follow.system';
import { createFallRecoveryEcsSystem } from './_recovery.system';
import { createChassisSpriteOffsetEcsSystem } from './_chassis-sprite-offset.system';

const renderLayers = {
  foreground: 1 << 0,
};

const gravity = new Vector2(0, -900);
const cameraOffset = new Vector2(0, 90);
const cameraZoom = 0.7;

const terrainOptions = {
  launchPad: 200,
  length: 6_000,
  flatStart: 300,
  slope: 0.09,
  bumpHeight: 15,
  bumpWavelength: 220,
};

export const createVehicleGame = async (): Promise<Game> => {
  const { game, world, renderContext, time } = createGame('demo-game');

  createCamera(world, {
    isStatic: true,
    cullingMask: renderLayers.foreground,
    zoom: cameraZoom,
  });

  const physicsWorld = new PhysicsWorld({ gravity });

  const terrainPoints = await createTerrain(
    world,
    renderContext,
    renderLayers.foreground,
    terrainOptions,
  );

  // createTerrain's points are the ground's centerline; the actual top
  // surface a vehicle should rest on is half a thickness above that.
  const groundSurfaceY = terrainPoints[0].y + terrainThickness / 2;

  const { chassis, chassisEntity, wheels } = await createVehicle(
    world,
    physicsWorld,
    renderContext,
    renderLayers.foreground,
    groundSurfaceY,
  );

  const recoverableBodies = [chassis, ...wheels].map((body) => ({
    body,
    spawnPosition: body.position.clone(),
    spawnAngle: body.angle,
  }));

  // wheels are created in [-wheelOffsetX, wheelOffsetX] order (see
  // createVehicle).
  const controlledWheels = [
    {
      wheel: wheels[0],
      anchorOffset: new Vector2(-wheelOffsetX, 0),
      restLength: suspensionRestLength,
    },
    {
      wheel: wheels[1],
      anchorOffset: new Vector2(wheelOffsetX, 0),
      restLength: suspensionRestLength,
    },
  ];

  const driveInput = new Axis1dAction(
    'vehicleDrive',
    null,
    actionResetTypes.noReset,
  );

  const inputManager = registerInputs(world, time, {
    axis1dActions: [driveInput],
  });

  const keyboardInputSource = new KeyboardInputSource(inputManager);

  keyboardInputSource.axis1dBindings.add(
    new KeyboardAxis1dBinding(driveInput, keyCodes.d, keyCodes.a),
  );
  keyboardInputSource.axis1dBindings.add(
    new KeyboardAxis1dBinding(
      driveInput,
      keyCodes.arrowRight,
      keyCodes.arrowLeft,
    ),
  );

  const gamepadInputSource = new GamepadInputSource(inputManager);

  gamepadInputSource.axis1dBindings.add(
    new GamepadAxis1dBinding(driveInput, {
      axisIndex: gamepadAxes.leftStickX,
    }),
  );

  world.addSystem(
    createFallRecoveryEcsSystem(recoverableBodies, chassis),
    SystemRegistrationOrder.early,
  );
  world.addSystem(
    createVehicleControlEcsSystem(
      driveInput,
      chassis,
      wheelRadius,
      controlledWheels,
    ),
    SystemRegistrationOrder.early,
  );
  world.addSystem(
    createWheelMotorEcsSystem(time),
    SystemRegistrationOrder.early,
  );
  world.addSystem(createPhysicsEcsSystem(physicsWorld, time));
  world.addSystem(
    createChassisSpriteOffsetEcsSystem(
      chassis,
      chassisEntity,
      chassisSpriteRenderOffset,
    ),
  );
  world.addSystem(createCameraFollowEcsSystem(chassis, cameraOffset));
  world.addSystem(createCameraEcsSystem(time));
  world.addSystem(createRenderEcsSystem(renderContext));

  return game;
};
