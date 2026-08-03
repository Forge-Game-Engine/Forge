import {
  Color,
  createCamera,
  createCameraEcsSystem,
  createRenderEcsSystem,
} from '@forge-game-engine/forge/rendering';
import { createGame, Game } from '@forge-game-engine/forge/utilities';
import {
  CollisionManifold,
  CollisionPair,
  ContactConstraint,
  createAngularVelocityMotorEcsSystem,
  createBroadPhaseEcsSystem,
  createCollisionResolutionEcsSystem,
  createEulerIntegrationEcsSystem,
  createGravityEcsSystem,
  createLinearDamperEcsSystem,
  createLinearSpringEcsSystem,
  createNarrowPhaseEcsSystem,
  createPrismaticJointEcsSystem,
  createRevoluteJointEcsSystem,
} from '@forge-game-engine/forge/physics';
import { createVector2, Random } from '@forge-game-engine/forge/math';
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

  // `isStatic: true` since this camera's position is driven by
  // `createCameraFollowEcsSystem` rather than `createCameraEcsSystem`'s
  // input-driven pan/zoom.
  const cameraEntity = createCamera(world, {
    isStatic: true,
    zoom: 0.5,
    cullingMask: renderLayers.foreground,
    clearColor: new Color(0.6, 0.6, 0.8),
    verticalWorldUnits: DEMO_VERTICAL_WORLD_UNITS,
  });

  const random = new Random('car');

  const { throttleInput, restartInput } = createInputs(world, time);

  const groundPosition = await createTerrain(
    world,
    renderContext,
    renderLayers.foreground,
    random,
  );

  const chassisEntity = await createCar(
    world,
    renderContext,
    renderLayers.foreground,
    groundPosition,
    throttleInput,
    restartInput,
  );

  addCameraFollowComponent(world, cameraEntity, {
    targetEntity: chassisEntity,
    offset: createVector2(140, 70),
    smoothTime: 0.25,
    maxSpeed: 3000,
  });

  const collisionPairs: CollisionPair[] = [];
  const collisionManifolds: CollisionManifold[] = [];
  const contactConstraints: ContactConstraint[] = [];

  // Each wheel mount chains two joints through its upright (chassis <->
  // upright via the prismatic joint, upright <-> wheel via the revolute
  // joint), and both mounts share the chassis body - the single-iteration
  // default is enough for an isolated joint, but this shared-body chain
  // needs several more per tick to stay stable at this rig's mass/torque
  // scale (confirmed empirically: with the default of 1, the chassis
  // tumbles and the car flies apart within the first second).
  const jointIterations = { iterations: 8 };

  // `createCarResetEcsSystem` may teleport every body back to its spawn
  // transform, so it runs first. `createGroundContactEcsSystem` recomputes
  // each wheel's grounded state from this tick's `collisionManifolds`
  // (populated by narrow-phase, just before it), and
  // `createWheelDriveEcsSystem` (sets each wheel's motor target from
  // `throttleInput`, but only requests full speed while that wheel's own
  // ground contact says it's grounded) / `createChassisStabilizerEcsSystem`
  // / `createAirControlEcsSystem` must run after it in this same list, so
  // they see this tick's grounded state rather than last tick's. The
  // suspension's spring/damper forces run before collision resolution (like
  // gravity), and the prismatic/revolute joints that hard-constrain each
  // wheel mount run after it, so they get the "last word" on velocity each
  // tick. `createCameraFollowEcsSystem` only needs to run before
  // `createRenderEcsSystem`, so this tick's camera position is reflected in
  // this tick's render.
  world.addSystem(createCarResetEcsSystem());
  world.addSystem(createGravityEcsSystem(time));
  world.addSystem(createBroadPhaseEcsSystem(collisionPairs));
  world.addSystem(
    createNarrowPhaseEcsSystem(collisionPairs, collisionManifolds),
  );
  world.addSystem(createGroundContactEcsSystem(collisionManifolds));
  world.addSystem(createWheelDriveEcsSystem());
  world.addSystem(createLinearSpringEcsSystem(time));
  world.addSystem(createLinearDamperEcsSystem(time));
  world.addSystem(
    createCollisionResolutionEcsSystem(
      collisionManifolds,
      contactConstraints,
      time,
    ),
  );
  world.addSystem(createPrismaticJointEcsSystem(time, jointIterations));
  world.addSystem(createRevoluteJointEcsSystem(time, jointIterations));
  world.addSystem(createAngularVelocityMotorEcsSystem(time));
  world.addSystem(createChassisStabilizerEcsSystem(time));
  world.addSystem(createAirControlEcsSystem(time));
  world.addSystem(createCameraFollowEcsSystem(time));
  world.addSystem(createCameraEcsSystem(time));
  world.addSystem(createRenderEcsSystem(renderContext));
  world.addSystem(createEulerIntegrationEcsSystem(time));

  return game;
};
