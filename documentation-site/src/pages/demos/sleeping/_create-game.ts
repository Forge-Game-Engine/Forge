import {
  createTransformEcsSystem,
  createTransformInterpolationEcsSystem,
  registerFixedUpdate,
} from '@forge-game-engine/forge/common';
import {
  CollisionManifold,
  CollisionPair,
  ContactConstraint,
  createBroadPhase,
  createBroadPhaseEcsSystem,
  createCollisionResolutionEcsSystem,
  createContinuousCollisionEcsSystem,
  createEulerIntegrationEcsSystem,
  createGravityEcsSystem,
  createNarrowPhaseEcsSystem,
  createRevoluteJointEcsSystem,
  createSleepEcsSystem,
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
import { createBodies, pyramidWidth } from './_create-bodies';
import { createInputs } from './_create-inputs';
import { createLevel } from './_create-level';
import { createSleepReadout } from './_create-sleep-readout';
import { addExplosionComponent } from './_explosion.component';
import { createExplosionEcsSystem } from './_explosion.system';
import { createSleepReadoutEcsSystem } from './_sleep-readout.system';
import { createSleepTintEcsSystem } from './_sleep-tint.system';
import { createTrapdoorEcsSystem } from './_trapdoor.system';

const renderLayers = {
  world: 1 << 0,
  ui: 1 << 1,
};

// The sleep system's default resting speed, 0.01 units a second, is
// Box2D's, which assumes a world measured in meters with bodies about a unit
// across. Outside fullscreen a world unit here is a CSS pixel (see
// DEMO_VERTICAL_WORLD_UNITS) and the boxes are 36 units across, so the
// default would only count a body as resting below a hundredth of a pixel a
// second, and a body still creeping too slowly to see would keep its whole
// island awake. It's scaled as if a meter were 40 units.
const pixelsPerMeter = 40;
const maxRestingSpeed = 0.01 * pixelsPerMeter;

const explosionForce = 800_000;
const explosionRadius = 250;

export const createSleepingGame = async (): Promise<Game> => {
  const { game, world, renderContext, time } = createGame('demo-game');

  const camera = createCamera(world, {
    isStatic: true,
    cullingMask: renderLayers.world,
    verticalWorldUnits: DEMO_VERTICAL_WORLD_UNITS,
  });

  const level = createLevel(
    world,
    camera,
    renderContext,
    renderLayers.world,
    pyramidWidth + 40,
  );
  await createBodies(world, renderContext, renderLayers.world, level);

  const inputs = createInputs(world, time, game.container);

  addExplosionComponent(world, world.createEntity(), {
    camera,
    force: explosionForce,
    radius: explosionRadius,
  });

  const collisionPairs: CollisionPair[] = [];
  const collisionManifolds: CollisionManifold[] = [];
  const contactConstraints: ContactConstraint[] = [];

  const fixedUpdate = registerFixedUpdate(world, time);
  const physics = { group: fixedUpdate };

  // Once per fixed step. The sleep system runs after the narrow phase, so
  // it reads this step's contacts and a body hit this step wakes before the
  // solver runs, and before gravity and every other system that changes
  // velocity, so a resting body isn't given this step's gravity before it's
  // checked for rest.
  createBroadPhase(world);
  world.addSystem(createTransformEcsSystem(time), physics);
  world.addSystem(createBroadPhaseEcsSystem(collisionPairs), physics);
  world.addSystem(
    createNarrowPhaseEcsSystem(collisionPairs, collisionManifolds),
    physics,
  );
  world.addSystem(
    createSleepEcsSystem(collisionManifolds, time, { maxRestingSpeed }),
    physics,
  );
  world.addSystem(createGravityEcsSystem(time), physics);
  world.addSystem(
    createCollisionResolutionEcsSystem(
      collisionManifolds,
      contactConstraints,
      time,
    ),
    physics,
  );
  world.addSystem(createRevoluteJointEcsSystem(time), physics);
  world.addSystem(createEulerIntegrationEcsSystem(time), physics);
  world.addSystem(createContinuousCollisionEcsSystem(), physics);
  world.addSystem(createTransformInterpolationEcsSystem(), physics);

  // Once per frame, after the fixed steps. The explosion and the trapdoor
  // change what physics sees, so the next step's sleep system wakes what
  // they disturbed. The UI systems the readout registers write the panel's
  // `local` poses, so they run before the transform system.
  world.addSystem(createExplosionEcsSystem(renderContext, inputs));
  world.addSystem(createTrapdoorEcsSystem(inputs.openTrapdoor));
  await createSleepReadout(world, renderContext, time, renderLayers.ui);

  world.addSystem(createTransformEcsSystem(time));
  world.addSystem(createCameraEcsSystem(time));
  world.addSystem(createSleepTintEcsSystem());
  world.addSystem(createSleepReadoutEcsSystem(collisionPairs));
  world.addSystem(createTextShapingEcsSystem());
  world.addSystem(createRenderEcsSystem(renderContext));
  world.addSystem(createPresentEcsSystem(renderContext));

  return game;
};
