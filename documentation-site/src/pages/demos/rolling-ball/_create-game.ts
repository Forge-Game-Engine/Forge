import {
  CLEAR_STRATEGY,
  Color,
  createCamera,
  createRenderEcsSystem,
  createTerrainRenderEcsSystem,
} from '@forge-game-engine/forge/rendering';
import { createGame, Game } from '@forge-game-engine/forge/utilities';
import {
  createAngularVelocityMotorEcsSystem,
  createPhysicsSyncEcsSystem,
  PhysicsWorld,
} from '@forge-game-engine/forge/physics';
import {
  PositionEcsComponent,
  positionId,
} from '@forge-game-engine/forge/common';
import { Vector2 } from '@forge-game-engine/forge/math';
import { getAssetUrl } from '@site/src/utils/get-asset-url';
import { createInputs } from './_create-inputs';
import { createTerrain } from './_create-terrain';
import { createPlayer } from './_create-player';
import { createRollEcsSystem } from './_roll.system';
import { createJumpEcsSystem } from './_jump.system';
import { createCameraFollowEcsSystem } from './_camera-follow.system';

const renderLayers = {
  foreground: 1 << 0,
};

const gravity = new Vector2(0, -700);
const terrainWidth = 8000;

export const createRollingBallGame = async (): Promise<Game> => {
  const { game, world, renderContext, time } = createGame('demo-game');

  // The terrain render system draws directly, outside the sprite pipeline
  // (see createTerrainRenderEcsSystem), and owns the frame's one real
  // clear; without `none` here, createRenderEcsSystem's own clear would
  // wipe the terrain right before drawing the sprites on top of it.
  renderContext.clearStrategy = CLEAR_STRATEGY.none;

  const cameraEntity = createCamera(world, {
    isStatic: true,
    cullingMask: renderLayers.foreground,
  });

  const physicsWorld = new PhysicsWorld({ gravity });

  const { rollInput, jumpInput } = createInputs(world, time);

  const terrain = await createTerrain(world, renderContext, {
    totalWidth: terrainWidth,
    border: {
      textureUrl: getAssetUrl(
        'img/kenney_pattern-pack/PNG/Default/pattern_19.png',
      ),
      tileSize: new Vector2(160, 150),
      tint: new Color(1, 1, 1, 1),
    },
    fill: {
      textureUrl: getAssetUrl(
        'img/kenney_pattern-pack/PNG/Default/pattern_37.png',
      ),
      tileSize: new Vector2(30, 30),
      tint: new Color(0.4, 0.29, 0.18, 1),
    },
    borderWidth: 30,
    borderBlend: 10,
  });

  const spawnPosition = new Vector2(
    terrain.spawnX,
    terrain.worldSurfaceYAt(terrain.spawnX) + 60,
  );

  const player = await createPlayer(
    world,
    renderContext,
    renderLayers.foreground,
    spawnPosition,
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

  cameraPosition.world = spawnPosition.clone();
  cameraPosition.local = spawnPosition.clone();

  // Roll input must be applied before the motor system, which must in turn
  // run before createPhysicsSyncEcsSystem, so this tick's input reaches
  // this tick's physics step - see the Applying Forces guide's registration
  // order caution. The jump/respawn and camera-follow systems read the
  // physics step's results, so they run after it instead. The terrain
  // render system must run before createRenderEcsSystem so the ball's
  // sprite draws on top of the terrain mesh, not underneath it.
  world.addSystem(createRollEcsSystem(rollInput));
  world.addSystem(createAngularVelocityMotorEcsSystem(time));
  world.addSystem(createPhysicsSyncEcsSystem(physicsWorld, time));
  world.addSystem(
    createJumpEcsSystem(
      physicsWorld,
      player.body,
      terrain.body,
      jumpInput,
      spawnPosition,
    ),
  );
  world.addSystem(createCameraFollowEcsSystem(playerPosition, time));
  world.addSystem(createTerrainRenderEcsSystem(renderContext, terrain.mesh));
  world.addSystem(createRenderEcsSystem(renderContext));

  return game;
};
