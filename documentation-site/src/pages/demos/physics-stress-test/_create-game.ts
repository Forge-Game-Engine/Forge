import {
  createTransformEcsSystem,
  createTransformInterpolationEcsSystem,
  registerFixedUpdate,
} from '@forge-game-engine/forge/common';
import { Random } from '@forge-game-engine/forge/math';
import {
  CollisionManifold,
  CollisionPair,
  ContactConstraint,
  createAngularVelocityMotorEcsSystem,
  createBroadPhase,
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
import {
  createCamera,
  createCameraEcsSystem,
  createPresentEcsSystem,
  createRenderEcsSystem,
} from '@forge-game-engine/forge/rendering';
import { createTextShapingEcsSystem } from '@forge-game-engine/forge/text';
import { createGame, Game } from '@forge-game-engine/forge/utilities';
import { DEMO_VERTICAL_WORLD_UNITS } from '@site/src/utils/demo-camera';
import { createBodySpawnerEcsSystem } from './_body-spawner.system';
import { createBodySpawner } from './_create-body-spawner';
import { createBoundaries } from './_create-boundaries';
import { createFpsMonitor } from './_create-fps-monitor';
import { createFpsMonitorEcsSystem } from './_fps-monitor.system';

const renderLayers = {
  world: 1 << 0,
  ui: 1 << 1,
};

export const createPhysicsStressTestGame = async (): Promise<Game> => {
  const { game, world, renderContext, time } = createGame('demo-game');

  const camera = createCamera(world, {
    isStatic: true,
    cullingMask: renderLayers.world,
    verticalWorldUnits: DEMO_VERTICAL_WORLD_UNITS,
  });

  const arena = await createBoundaries(
    world,
    camera,
    renderContext,
    renderLayers.world,
  );
  const spawner = await createBodySpawner(
    world,
    renderContext,
    arena,
    renderLayers.world,
  );

  // The whole physics pipeline, in the order the physics guide lists, once
  // per fixed step. The spring, damper, joint and motor systems match no
  // entities here; they're registered so the cost is that of a game using
  // every feature. Physics runs 60 steps a second whatever the display rate,
  // so below 60 FPS a frame runs several steps and costs more.
  const collisionPairs: CollisionPair[] = [];
  const collisionManifolds: CollisionManifold[] = [];
  const contactConstraints: ContactConstraint[] = [];

  const fixedUpdate = registerFixedUpdate(world, time);
  const physics = { group: fixedUpdate };

  world.addSystem(createTransformEcsSystem(time), physics);
  world.addSystem(createGravityEcsSystem(time), physics);
  world.addSystem(createLinearSpringEcsSystem(time), physics);
  world.addSystem(createLinearDamperEcsSystem(time), physics);
  createBroadPhase(world);
  world.addSystem(createBroadPhaseEcsSystem(collisionPairs), physics);
  world.addSystem(
    createNarrowPhaseEcsSystem(collisionPairs, collisionManifolds),
    physics,
  );
  world.addSystem(
    createCollisionResolutionEcsSystem(
      collisionManifolds,
      contactConstraints,
      time,
    ),
    physics,
  );
  world.addSystem(createRevoluteJointEcsSystem(time), physics);
  world.addSystem(createPrismaticJointEcsSystem(time), physics);
  world.addSystem(createAngularVelocityMotorEcsSystem(time), physics);
  world.addSystem(createEulerIntegrationEcsSystem(time), physics);
  world.addSystem(createContinuousCollisionEcsSystem(), physics);
  world.addSystem(createTransformInterpolationEcsSystem(), physics);

  // Once per frame, after the fixed steps. Registers the UI layout systems,
  // which write the readout's `local` poses, so they run before the
  // transform system below.
  await createFpsMonitor(world, renderContext, time, spawner, renderLayers.ui);

  // The bodies it spawns enter the simulation at the next fixed step, whose
  // transform system gives them a `world` pose before physics reads it.
  world.addSystem(createBodySpawnerEcsSystem(time, new Random()));

  world.addSystem(createTransformEcsSystem(time));
  world.addSystem(createCameraEcsSystem(time));
  world.addSystem(createTextShapingEcsSystem());
  world.addSystem(createRenderEcsSystem(renderContext));
  world.addSystem(createPresentEcsSystem(renderContext));
  world.addSystem(createFpsMonitorEcsSystem(time));

  return game;
};
