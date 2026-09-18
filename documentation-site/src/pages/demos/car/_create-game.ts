import {
  Color,
  createCamera,
  createCameraEcsSystem,
  createRenderEcsSystem,
  createTerrainRenderEcsSystem,
} from '@forge-game-engine/forge/rendering';
import { createGame, Game } from '@forge-game-engine/forge/utilities';
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

  // Each wheel mount chains two joints through its upright (chassis <->
  // upright via the prismatic joint, upright <-> wheel via the revolute
  // joint), and both mounts share the chassis body - the single-iteration
  // default is enough for an isolated joint, but this shared-body chain
  // needs several more per tick to stay stable at this rig's mass/torque
  // scale (confirmed empirically: with the default of 1, the chassis
  // tumbles and the car flies apart within the first second).
  const jointIterations = { iterations: 8 };

  // `createCollisionResolutionEcsSystem`'s default `maxBiasSpeed` (3 units/
  // second) is tuned for Box2D's own meters-scale default (its
  // `contactPushMaxSpeed` is `3.0 * b2_lengthUnitsPerMeter`) - this course's
  // world units are pixel-scale instead (`gravity` above is -600, roughly
  // 60x real-world `g`, and `wheelRadius` alone is 100 units), so a wheel
  // that lands hard after catching air off a hill can end up tens of units
  // deep in the terrain in a single tick, and 3 units/second of correction
  // then takes many seconds to dig it back out - long enough to read as the
  // wheel being stuck clipped into the ground rather than momentarily
  // compressed into it. Scaling the cap up by roughly the same ~60-100x
  // this course's units are bigger than Box2D's assumed meters (confirmed
  // empirically: 300 clears a hard landing within a fraction of a second,
  // matching how quickly the suspension itself settles, without changing
  // resting behavior on flat ground - the cap only matters once penetration
  // is already large) restores the "quickly digs itself back out" feel
  // `maxBiasSpeed` is meant to provide at this course's actual scale.
  const collisionResolutionOptions = { maxBiasSpeed: 300 };

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
  // this tick's render. `createContinuousCollisionEcsSystem` must run after
  // every system above that can still change `velocity` this tick and
  // right before `createEulerIntegrationEcsSystem`, so it sweeps each
  // wheel's actual, fully-resolved this-tick translation - this is what
  // stops a wheel landing hard at speed from tunneling into the terrain in
  // a single tick (see design/continuous-collision-detection.md).
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
  world.addSystem(createContinuousCollisionEcsSystem(time));
  world.addSystem(createEulerIntegrationEcsSystem(time));

  return game;
};
