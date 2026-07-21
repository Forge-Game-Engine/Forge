import {
  createCamera,
  createCameraEcsSystem,
  createRenderEcsSystem,
} from '@forge-game-engine/forge/rendering';
import { createGame, Game } from '@forge-game-engine/forge/utilities';
import {
  createAngularVelocityMotorEcsSystem,
  createLinearDamperEcsSystem,
  createLinearSpringEcsSystem,
  createPhysicsSyncEcsSystem,
  PhysicsWorld,
} from '@forge-game-engine/forge/physics';
import { Random, Vector2 } from '@forge-game-engine/forge/math';
import { addCameraFollowComponent } from './_camera-follow.component';
import { createCameraFollowEcsSystem } from './_camera-follow.system';
import { createCarResetEcsSystem } from './_car-reset.system';
import { createChassisStabilizerEcsSystem } from './_chassis-stabilizer.system';
import { createCar } from './_create-car';
import { createInputs } from './_create-inputs';
import { createTerrain } from './_create-terrain';
import { createWheelDriveEcsSystem } from './_wheel-drive.system';

const renderLayers = {
  foreground: 1 << 0,
};

const gravity = new Vector2(0, -600);

export const createHillClimbRacerGame = async (): Promise<Game> => {
  const { game, world, renderContext, time } = createGame('demo-game');

  // `isStatic: true` since this camera's position is driven by
  // `createCameraFollowEcsSystem` rather than `createCameraEcsSystem`'s
  // input-driven pan/zoom.
  const cameraEntity = createCamera(world, {
    isStatic: true,
    zoom: 0.8,
    cullingMask: renderLayers.foreground,
  });

  const physicsWorld = new PhysicsWorld({ gravity });
  const random = new Random('hill-climb-racer');

  const { throttleInput, restartInput } = createInputs(world, time);

  const groundPosition = await createTerrain(
    world,
    renderContext,
    renderLayers.foreground,
    random,
  );

  const chassisBody = await createCar(
    world,
    renderContext,
    renderLayers.foreground,
    groundPosition,
    throttleInput,
    restartInput,
  );

  addCameraFollowComponent(world, cameraEntity, {
    target: chassisBody,
    offset: new Vector2(140, 70),
    smoothTime: 0.25,
    maxSpeed: 3000,
  });

  // `createWheelDriveEcsSystem` sets each wheel's motor target from
  // `throttleInput`, `createCarResetEcsSystem` may teleport every body back
  // to its spawn transform, and `createAngularVelocityMotorEcsSystem` /
  // `createLinearSpringEcsSystem` / `createLinearDamperEcsSystem` /
  // `createChassisStabilizerEcsSystem` compute this tick's torque/forces
  // from the (possibly just-changed) state above - all six must run before
  // `createPhysicsSyncEcsSystem`, which is what steps `physicsWorld` (see
  // the Applying Forces guide's registration-order caution).
  // `createCameraFollowEcsSystem` only needs to run before
  // `createRenderEcsSystem`, so this tick's camera position is reflected in
  // this tick's render.
  world.addSystem(createWheelDriveEcsSystem());
  world.addSystem(createCarResetEcsSystem());
  world.addSystem(createAngularVelocityMotorEcsSystem(time));
  world.addSystem(createLinearSpringEcsSystem(time));
  world.addSystem(createLinearDamperEcsSystem(time));
  world.addSystem(createChassisStabilizerEcsSystem(time));
  world.addSystem(createCameraFollowEcsSystem(time));
  world.addSystem(createCameraEcsSystem(time));
  world.addSystem(createRenderEcsSystem(renderContext));
  world.addSystem(createPhysicsSyncEcsSystem(physicsWorld, time));

  return game;
};
