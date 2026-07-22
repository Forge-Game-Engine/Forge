import {
  createCamera,
  createRenderEcsSystem,
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

  const cameraEntity = createCamera(world, {
    isStatic: true,
    cullingMask: renderLayers.foreground,
  });

  const physicsWorld = new PhysicsWorld({ gravity });

  const { rollInput, jumpInput } = createInputs(world, time);

  const terrain = createTerrain(
    world,
    renderContext,
    renderLayers.foreground,
    terrainWidth,
  );

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
  // physics step's results, so they run after it instead.
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
  world.addSystem(createRenderEcsSystem(renderContext));

  return game;
};
