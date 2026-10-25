import {
  Color,
  createCamera,
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
  createContinuousCollisionEcsSystem,
  createEulerIntegrationEcsSystem,
  createGravityEcsSystem,
  createNarrowPhaseEcsSystem,
} from '@forge-game-engine/forge/physics';
import {
  createTransformEcsSystem,
  PositionEcsComponent,
  positionId,
  registerFixedUpdate,
} from '@forge-game-engine/forge/common';
import { Vec2 } from '@forge-game-engine/forge/math';
import { getAssetUrl } from '@site/src/utils/get-asset-url';
import { DEMO_VERTICAL_WORLD_UNITS } from '@site/src/utils/demo-camera';
import { createInputs } from './_create-inputs';
import { createTerrain } from './_create-terrain';
import { createPlayer } from './_create-player';
import { createRollEcsSystem } from './_roll.system';
import { createJumpEcsSystem } from './_jump.system';
import { createCameraFollowEcsSystem } from './_camera-follow.system';

const renderLayers = {
  foreground: 1 << 0,
};

const gravity = { x: 0, y: 700 };
const terrainWidth = 8000;

export const createRollingBallGame = async (): Promise<Game> => {
  const { game, world, renderContext, time } = createGame('demo-game');

  const cameraEntity = createCamera(world, {
    isStatic: true,
    cullingMask: renderLayers.foreground,
    verticalWorldUnits: DEMO_VERTICAL_WORLD_UNITS,
  });

  const { rollInput, jumpInput } = createInputs(world, time);

  const terrain = await createTerrain(world, renderContext, {
    totalWidth: terrainWidth,
    border: {
      textureUrl: getAssetUrl(
        'img/kenney_pattern-pack/PNG/Default/pattern_19.png',
      ),
      tileSize: { x: 160, y: 150 },
      tint: new Color(0.6, 0.6, 0.6, 1),
    },
    fill: {
      textureUrl: getAssetUrl(
        'img/kenney_pattern-pack/PNG/Default/pattern_37.png',
      ),
      tileSize: { x: 30, y: 30 },
      tint: new Color(0.4, 0.29, 0.18, 1),
    },
    borderWidth: 30,
    borderBlend: 5,
  });

  const spawnPosition = {
    x: terrain.spawnX,
    y: terrain.worldSurfaceYAt(terrain.spawnX) - 60,
  };

  const player = await createPlayer(
    world,
    renderContext,
    renderLayers.foreground,
    spawnPosition,
    gravity,
  );

  const playerPosition = world.getComponent<PositionEcsComponent>(
    player.entity,
    positionId,
  )!;

  // Start the camera already centered on the ball, rather than easing in
  // from the world origin on the first frame.
  const cameraPosition = world.getComponent<PositionEcsComponent>(
    cameraEntity,
    positionId,
  )!;

  cameraPosition.local = Vec2.clone(spawnPosition);

  const collisionPairs: CollisionPair[] = [];
  const collisionManifolds: CollisionManifold[] = [];
  const contactConstraints: ContactConstraint[] = [];

  // The physics systems run once per fixed step, so the ball rolls the same
  // at any frame rate. Roll input must be applied before the motor system,
  // which must in turn run before the broad/narrow-phase and resolution
  // systems, so each step's motor target reaches that step's physics - see
  // the Applying Forces guide's registration order caution. The transform
  // system runs first, so each step reads the poses the previous step left
  // in `local`.
  const fixedUpdate = registerFixedUpdate(world, time);
  const physics = { group: fixedUpdate };

  world.addSystem(createRollEcsSystem(rollInput), physics);
  world.addSystem(createTransformEcsSystem(), physics);
  world.addSystem(createAngularVelocityMotorEcsSystem(time), physics);
  world.addSystem(createGravityEcsSystem(time), physics);
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
  world.addSystem(createEulerIntegrationEcsSystem(time), physics);
  world.addSystem(createContinuousCollisionEcsSystem(), physics);

  // Once per frame, after the fixed steps. The jump reads a press made this
  // frame, so it runs here, where it sees each press exactly once. It and
  // the camera-follow system write `local` positions before the transform
  // system, so the frame shows their changes. The terrain mesh draws behind
  // the ball's sprite because the terrain entity is created first: the
  // render system draws them in creation order.
  world.addSystem(
    createJumpEcsSystem(
      player.entity,
      terrain.entity,
      jumpInput,
      spawnPosition,
    ),
  );
  world.addSystem(createCameraFollowEcsSystem(playerPosition, time));
  world.addSystem(createTransformEcsSystem());
  world.addSystem(createRenderEcsSystem(renderContext));

  return game;
};
