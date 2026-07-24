import {
  CLEAR_STRATEGY,
  Color,
  createCamera,
  createCameraEcsSystem,
  createRenderEcsSystem,
  createTerrainRenderEcsSystem,
} from '@forge-game-engine/forge/rendering';
import { createGame, Game } from '@forge-game-engine/forge/utilities';
import {
  createAngularVelocityMotorEcsSystem,
  createLinearDamperEcsSystem,
  createLinearSpringEcsSystem,
  createPhysicsSyncEcsSystem,
  createPrismaticJointEcsSystem,
  createRevoluteJointEcsSystem,
  PhysicsWorld,
} from '@forge-game-engine/forge/physics';
import { Random, Vector2 } from '@forge-game-engine/forge/math';
import { createAirControlEcsSystem } from './_air-control.system';
import { addCameraFollowComponent } from './_camera-follow.component';
import { createCameraFollowEcsSystem } from './_camera-follow.system';
import { createCarResetEcsSystem } from './_car-reset.system';
import { createChassisStabilizerEcsSystem } from './_chassis-stabilizer.system';
import { createCar } from './_create-car';
import { createInputs } from './_create-inputs';
import { createTerrain } from './_create-terrain';
import { createGroundContactEcsSystem } from './_ground-contact.system';
import { createWheelDriveEcsSystem } from './_wheel-drive.system';

const renderLayers = {
  foreground: 1 << 0,
};

const gravity = new Vector2(0, -600);

export const createHillClimbRacerGame = async (): Promise<Game> => {
  const { game, world, renderContext, time } = createGame('demo-game');

  // The terrain render system draws directly, outside the sprite pipeline
  // (see createTerrainRenderEcsSystem), and owns the frame's one real
  // clear; without `none` here, createRenderEcsSystem's own clear would
  // wipe the terrain right before drawing the sprites on top of it.
  renderContext.clearStrategy = CLEAR_STRATEGY.none;

  // `isStatic: true` since this camera's position is driven by
  // `createCameraFollowEcsSystem` rather than `createCameraEcsSystem`'s
  // input-driven pan/zoom.
  const cameraEntity = createCamera(world, {
    isStatic: true,
    zoom: 0.8,
    cullingMask: renderLayers.foreground,
    clearColor: new Color(0.6, 0.6, 0.8),
  });

  const physicsWorld = new PhysicsWorld({ gravity });
  const random = new Random('hill-climb-racer');

  const { throttleInput, restartInput } = createInputs(world, time);

  const terrain = await createTerrain(world, renderContext, random);

  const chassisBody = await createCar(
    world,
    renderContext,
    renderLayers.foreground,
    terrain.spawnPosition,
    throttleInput,
    restartInput,
  );

  addCameraFollowComponent(world, cameraEntity, {
    target: chassisBody,
    offset: new Vector2(140, 70),
    smoothTime: 0.25,
    maxSpeed: 3000,
  });

  // `createCarResetEcsSystem` may teleport every body back to its spawn
  // transform, `createPrismaticJointEcsSystem` / `createRevoluteJointEcsSystem`
  // register each wheel mount's joints (see `createWheelMount`) with
  // `physicsWorld`, and `createGroundContactEcsSystem` refreshes each
  // wheel's grounded state from `physicsWorld.collisionStarts`/
  // `collisionEnds` (one tick stale, the same lag any contact-based "am I
  // grounded" check in a fixed-step engine has). `createWheelDriveEcsSystem`
  // (sets each wheel's motor target from `throttleInput`, but only requests
  // full speed while that wheel's own ground contact says it's grounded) /
  // `createAngularVelocityMotorEcsSystem` / `createLinearSpringEcsSystem` /
  // `createLinearDamperEcsSystem` / `createChassisStabilizerEcsSystem` /
  // `createAirControlEcsSystem` compute this tick's torque/forces from the
  // (possibly just-changed) state above - all ten must run before
  // `createPhysicsSyncEcsSystem`, which is what steps `physicsWorld` (see
  // the Applying Forces guide's registration-order caution).
  // `createWheelDriveEcsSystem`/`createChassisStabilizerEcsSystem`/
  // `createAirControlEcsSystem` must also run after
  // `createGroundContactEcsSystem` in this same list, so they see this
  // tick's grounded state rather than last tick's. `createCameraFollowEcsSystem`
  // only needs to run before `createRenderEcsSystem`, so this tick's camera
  // position is reflected in this tick's render. `createTerrainRenderEcsSystem`
  // must run before `createRenderEcsSystem` so the car's sprites draw on top
  // of the terrain mesh, not underneath it.
  world.addSystem(createCarResetEcsSystem());
  world.addSystem(createPrismaticJointEcsSystem(physicsWorld));
  world.addSystem(createRevoluteJointEcsSystem(physicsWorld));
  world.addSystem(createGroundContactEcsSystem(physicsWorld));
  world.addSystem(createWheelDriveEcsSystem());
  world.addSystem(createAngularVelocityMotorEcsSystem(time));
  world.addSystem(createLinearSpringEcsSystem(time));
  world.addSystem(createLinearDamperEcsSystem(time));
  world.addSystem(createChassisStabilizerEcsSystem(time));
  world.addSystem(createAirControlEcsSystem(time));
  world.addSystem(createCameraFollowEcsSystem(time));
  world.addSystem(createCameraEcsSystem(time));
  world.addSystem(createTerrainRenderEcsSystem(renderContext, terrain.mesh));
  world.addSystem(createRenderEcsSystem(renderContext));
  world.addSystem(createPhysicsSyncEcsSystem(physicsWorld, time));

  return game;
};
