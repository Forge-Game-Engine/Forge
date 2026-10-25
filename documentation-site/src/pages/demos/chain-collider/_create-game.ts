import {
  createTransformEcsSystem,
  registerFixedUpdate,
} from '@forge-game-engine/forge/common';
import {
  buttonMoments,
  KeyboardInputSource,
  KeyboardTriggerBinding,
  keyCodes,
  mouseButtons,
  MouseInputSource,
  MouseTriggerBinding,
  registerInputs,
  TriggerAction,
} from '@forge-game-engine/forge/input';
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
} from '@forge-game-engine/forge/physics';
import {
  createCamera,
  createCameraEcsSystem,
  createImageSprite,
  createRenderEcsSystem,
} from '@forge-game-engine/forge/rendering';
import { createGame, Game } from '@forge-game-engine/forge/utilities';
import { DEMO_VERTICAL_WORLD_UNITS } from '@site/src/utils/demo-camera';
import { getAssetUrl } from '@site/src/utils/get-asset-url';
import { createLevel } from './_create-level';
import { createSpawnBodiesEcsSystem } from './_spawn-bodies.system';

const renderLayer = 1 << 0;

export const createChainColliderGame = async (): Promise<Game> => {
  const { game, world, renderContext, time } = createGame('demo-game');

  const camera = createCamera(world, {
    isStatic: true,
    cullingMask: renderLayer,
    verticalWorldUnits: DEMO_VERTICAL_WORLD_UNITS,
  });

  createLevel(world, renderContext, renderLayer);

  const [boxTexture, ballTexture] = await Promise.all([
    renderContext.textureCache.getOrLoad(
      getAssetUrl('img/physics/block_square.png'),
    ),
    renderContext.textureCache.getOrLoad(
      getAssetUrl('img/physics/ball_blue_large.png'),
    ),
  ]);

  const dropBoxInput = new TriggerAction('drop-box');
  const dropBallInput = new TriggerAction('drop-ball');
  const fireBallInput = new TriggerAction('fire-ball');
  const inputManager = registerInputs(world, time, {
    triggerActions: [dropBoxInput, dropBallInput, fireBallInput],
  });
  const keyboardInputSource = new KeyboardInputSource(inputManager);
  const mouseInputSource = new MouseInputSource(inputManager, game.container);

  mouseInputSource.triggerBindings.add(
    new MouseTriggerBinding(
      dropBoxInput,
      mouseButtons.left,
      buttonMoments.down,
    ),
  );
  keyboardInputSource.triggerBindings.add(
    new KeyboardTriggerBinding(dropBallInput, keyCodes.b, buttonMoments.down),
  );
  keyboardInputSource.triggerBindings.add(
    new KeyboardTriggerBinding(
      fireBallInput,
      keyCodes.space,
      buttonMoments.down,
    ),
  );

  const collisionPairs: CollisionPair[] = [];
  const collisionManifolds: CollisionManifold[] = [];
  const contactConstraints: ContactConstraint[] = [];

  const fixedUpdate = registerFixedUpdate(world, time);
  const physics = { group: fixedUpdate };

  // Once per fixed step. The level's `ChainCollider` is one broad-phase
  // entry; the narrow phase asks it for the edges near each body, so a level
  // of any size costs one pair per body.
  world.addSystem(createTransformEcsSystem(), physics);
  world.addSystem(createGravityEcsSystem(time), physics);
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
  world.addSystem(createEulerIntegrationEcsSystem(time), physics);
  // Sweeps fast circles against the chain's edges, so the fired ball stops
  // at the near side of the thin wall instead of passing through it.
  world.addSystem(createContinuousCollisionEcsSystem(), physics);

  // Once per frame, after the fixed steps.
  world.addSystem(
    createSpawnBodiesEcsSystem({
      dropBoxInput,
      dropBallInput,
      fireBallInput,
      mouseInputSource,
      camera,
      renderContext,
      boxSprite: { ...createImageSprite(boxTexture), category: renderLayer },
      ballSprite: { ...createImageSprite(ballTexture), category: renderLayer },
    }),
  );
  world.addSystem(createTransformEcsSystem());
  world.addSystem(createCameraEcsSystem(time));
  world.addSystem(createRenderEcsSystem(renderContext));

  return game;
};
