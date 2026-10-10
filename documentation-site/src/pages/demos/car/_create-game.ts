import {
  Color,
  createCamera,
  createCameraEcsSystem,
  createRenderEcsSystem,
  createTerrainRenderEcsSystem,
} from '@forge-game-engine/forge/rendering';
import { createGame, Game } from '@forge-game-engine/forge/utilities';
import { createTransformEcsSystem } from '@forge-game-engine/forge/common';
import {
  CollisionManifold,
  CollisionPair,
  ContactConstraint,
  createAngularVelocityMotorEcsSystem,
  createBroadPhaseEcsSystem,
  createCollisionResolutionEcsSystem,
  createContinuousCollisionEcsSystem,
  createEulerIntegrationEcsSystem,
  createGravityEcsSystem,
  createLinearDamperEcsSystem,
  createLinearSpringEcsSystem,
  createNarrowPhaseEcsSystem,
  createPrismaticJointEcsSystem,
  createRevoluteJointEcsSystem,
} from '@forge-game-engine/forge/physics';
import { Random } from '@forge-game-engine/forge/math';
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
import { DEMO_VERTICAL_WORLD_UNITS } from '@site/src/utils/demo-camera';

const renderLayers = {
  foreground: 1 << 0,
};

export const createCarGame = async (): Promise<Game> => {
  const { game, world, renderContext, time } = createGame('demo-game');

  // Static: the camera-follow system moves this camera, not pan/zoom input.
  const cameraEntity = createCamera(world, {
    isStatic: true,
    zoom: 0.5,
    cullingMask: renderLayers.foreground,
    clearColor: new Color(0.6, 0.6, 0.8),
    verticalWorldUnits: DEMO_VERTICAL_WORLD_UNITS,
  });

  const random = new Random('car');

  const { throttleInput, restartInput } = createInputs(world, time);

  const terrain = await createTerrain(world, renderContext, random);

  const chassisEntity = await createCar(
    world,
    renderContext,
    renderLayers.foreground,
    terrain.groundPosition,
    throttleInput,
    restartInput,
  );

  addCameraFollowComponent(world, cameraEntity, {
    targetEntity: chassisEntity,
    offset: { x: 140, y: 70 },
    smoothTime: 0.25,
    maxSpeed: 3000,
  });

  const collisionPairs: CollisionPair[] = [];
  const collisionManifolds: CollisionManifold[] = [];
  const contactConstraints: ContactConstraint[] = [];

  // Each wheel hangs from two chained joints that share the chassis, which
  // needs more solver iterations than the default to stay stable.
  const jointIterations = { iterations: 8 };

  // The default correction speed is tuned for metre-scale worlds. This
  // world is pixel-scale, so a wheel that lands hard would take seconds to
  // dig itself out of the ground.
  const collisionResolutionOptions = { maxBiasSpeed: 300 };

  // System order matters:
  // 1. Reset, then transforms, so a restart shows up this tick.
  // 2. Ground contact after narrow phase (which fills contacts), and before
  //    the systems that read it (wheel drive, stabilizer, air control).
  // 3. Springs and dampers before collision resolution; joints after it, so
  //    they get the last word on velocity.
  // 4. Continuous collision right after integration, so a fast wheel stops
  //    at the ground instead of sinking into it.
  world.addSystem(createCarResetEcsSystem());
  world.addSystem(createTransformEcsSystem());
  world.addSystem(createGravityEcsSystem(time));
  world.addSystem(createBroadPhaseEcsSystem(collisionPairs));
  world.addSystem(
    createNarrowPhaseEcsSystem(collisionPairs, collisionManifolds),
  );
  world.addSystem(createGroundContactEcsSystem());
  world.addSystem(createWheelDriveEcsSystem());
  world.addSystem(createLinearSpringEcsSystem(time));
  world.addSystem(createLinearDamperEcsSystem(time));
  world.addSystem(
    createCollisionResolutionEcsSystem(
      collisionManifolds,
      contactConstraints,
      time,
      collisionResolutionOptions,
    ),
  );
  world.addSystem(createPrismaticJointEcsSystem(time, jointIterations));
  world.addSystem(createRevoluteJointEcsSystem(time, jointIterations));
  world.addSystem(createAngularVelocityMotorEcsSystem(time));
  world.addSystem(createChassisStabilizerEcsSystem(time));
  world.addSystem(createAirControlEcsSystem(time));
  world.addSystem(createCameraFollowEcsSystem(time));
  world.addSystem(createCameraEcsSystem(time));
  world.addSystem(createTerrainRenderEcsSystem(renderContext));
  world.addSystem(createRenderEcsSystem(renderContext));
  world.addSystem(createEulerIntegrationEcsSystem(time));
  world.addSystem(createContinuousCollisionEcsSystem());

  return game;
};
