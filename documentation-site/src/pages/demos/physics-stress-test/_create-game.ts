import { createTransformEcsSystem } from '@forge-game-engine/forge/common';
import { Random } from '@forge-game-engine/forge/math';
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

  // Registers the UI layout systems, which write the readout's `local`
  // poses, so they run before the transform system below.
  await createFpsMonitor(world, renderContext, time, spawner, renderLayers.ui);

  // Before the transform system, so each body it spawns (with only a
  // `local` pose) gets its `world` pose before physics first reads it.
  world.addSystem(createBodySpawnerEcsSystem(time, new Random()));

  // The whole physics pipeline, in the order the physics guide lists. The
  // spring, damper, joint and motor systems match no entities here; they're
  // registered so the frame cost is that of a game using every feature.
  const collisionPairs: CollisionPair[] = [];
  const collisionManifolds: CollisionManifold[] = [];
  const contactConstraints: ContactConstraint[] = [];

  world.addSystem(createTransformEcsSystem());
  world.addSystem(createGravityEcsSystem(time));
  world.addSystem(createLinearSpringEcsSystem(time));
  world.addSystem(createLinearDamperEcsSystem(time));
  world.addSystem(createBroadPhaseEcsSystem(collisionPairs));
  world.addSystem(
    createNarrowPhaseEcsSystem(collisionPairs, collisionManifolds),
  );
  world.addSystem(
    createCollisionResolutionEcsSystem(
      collisionManifolds,
      contactConstraints,
      time,
    ),
  );
  world.addSystem(createRevoluteJointEcsSystem(time));
  world.addSystem(createPrismaticJointEcsSystem(time));
  world.addSystem(createAngularVelocityMotorEcsSystem(time));
  world.addSystem(createEulerIntegrationEcsSystem(time));
  world.addSystem(createContinuousCollisionEcsSystem());

  world.addSystem(createCameraEcsSystem(time));
  world.addSystem(createTextShapingEcsSystem());
  world.addSystem(createRenderEcsSystem(renderContext));
  world.addSystem(createPresentEcsSystem(renderContext));
  world.addSystem(createFpsMonitorEcsSystem(time));

  return game;
};
