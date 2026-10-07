import { createTransformEcsSystem } from '@forge-game-engine/forge/common';
import defaultFontImageUrl from '@forge-game-engine/forge/fonts/default/default.png';
import {
  Axis1dAction,
  buttonMoments,
  KeyboardAxis1dBinding,
  KeyboardInputSource,
  KeyboardTriggerBinding,
  keyCodes,
  registerInputs,
  TriggerAction,
} from '@forge-game-engine/forge/input';
import { Random } from '@forge-game-engine/forge/math';
import {
  Color,
  createCamera,
  createCameraEcsSystem,
  getCameraView,
  createImageSprite,
  createRenderEcsSystem,
} from '@forge-game-engine/forge/rendering';
import {
  createGameState,
  inState,
  onEnter,
} from '@forge-game-engine/forge/states';
import {
  createTextShapingEcsSystem,
  FontAtlasCache,
} from '@forge-game-engine/forge/text';
import { createGame, Game } from '@forge-game-engine/forge/utilities';
import { DEMO_VERTICAL_WORLD_UNITS } from '@site/src/utils/demo-camera';
import { getAssetUrl } from '@site/src/utils/get-asset-url';
import { DemoStateName, Round } from './_demo-state';
import { createHudEcsSystem } from './_hud.system';
import { createPlayerEcsSystem } from './_player.system';
import {
  createShowGameOverEcsSystem,
  createShowMenuEcsSystem,
  createStartRoundEcsSystem,
} from './_screens';
import {
  createGameOverInputEcsSystem,
  createMenuInputEcsSystem,
} from './_state-input.system';
import {
  createStarEcsSystem,
  createStarSpawnerEcsSystem,
} from './_star.system';

/**
 * Builds the game states demo: a menu, a round of catching falling stars,
 * and a game-over screen. Each state's setup runs once, in the state's
 * enter group, gameplay systems only run while `playing`, and every entity
 * is removed by its state-scoped component, so no system checks the state
 * or cleans up after a round.
 * @returns The created game.
 */
export const createGameStatesGame = async (): Promise<Game> => {
  const { game, world, renderContext, time } = createGame('demo-game');

  const camera = createCamera(world, {
    isStatic: true,
    verticalWorldUnits: DEMO_VERTICAL_WORLD_UNITS,
  });

  const fontAtlas = await new FontAtlasCache(renderContext).getOrLoad({
    // Importing the JSON would give its parsed contents, so `new URL` asks
    // webpack for its URL instead.
    metricsUrl: new URL(
      '@forge-game-engine/forge/fonts/default/default.json',
      import.meta.url,
    ).href,
    imageUrl: defaultFontImageUrl,
  });

  const starSprite = createImageSprite(
    await renderContext.textureCache.getOrLoad(
      getAssetUrl('img/star_large.png'),
    ),
  );
  starSprite.width = 36;
  starSprite.height = 36;

  const basketSprite = createImageSprite(renderContext.whiteTexture);
  basketSprite.width = 110;
  basketSprite.height = 16;
  basketSprite.tintColor = new Color(0.3, 0.75, 1, 1);

  const visibleSize = getCameraView(world, camera, renderContext).size;
  const playArea = {
    halfWidth: visibleSize.x / 2,
    halfHeight: visibleSize.y / 2,
  };

  const moveInput = new Axis1dAction('move');
  const playInput = new TriggerAction('play');
  const menuInput = new TriggerAction('menu');

  const inputManager = registerInputs(world, time, {
    axis1dActions: [moveInput],
    triggerActions: [playInput, menuInput],
  });
  const keyboard = new KeyboardInputSource(inputManager);

  keyboard.axis1dBindings.add(
    new KeyboardAxis1dBinding(
      moveInput,
      keyCodes.arrowRight,
      keyCodes.arrowLeft,
    ),
  );
  keyboard.axis1dBindings.add(
    new KeyboardAxis1dBinding(moveInput, keyCodes.d, keyCodes.a),
  );
  keyboard.triggerBindings.add(
    new KeyboardTriggerBinding(playInput, keyCodes.space, buttonMoments.down),
  );
  keyboard.triggerBindings.add(
    new KeyboardTriggerBinding(menuInput, keyCodes.escape, buttonMoments.down),
  );

  const state = createGameState<DemoStateName>(world, 'menu');
  const round: Round = { score: 0, misses: 0, secondsUntilNextStar: 0 };

  // Set-up for each state runs once, when it's entered.
  world.addSystem(createShowMenuEcsSystem(state, fontAtlas), {
    group: state.enterGroup,
    runIf: onEnter(state, 'menu'),
  });
  world.addSystem(
    createStartRoundEcsSystem(state, round, fontAtlas, basketSprite, playArea),
    { group: state.enterGroup, runIf: onEnter(state, 'playing') },
  );
  world.addSystem(createShowGameOverEcsSystem(state, round, fontAtlas), {
    group: state.enterGroup,
    runIf: onEnter(state, 'gameOver'),
  });

  // Each state's own systems only run in it.
  world.addSystem(createMenuInputEcsSystem(state, playInput), {
    runIf: inState(state, 'menu'),
  });
  world.addSystem(createGameOverInputEcsSystem(state, playInput, menuInput), {
    runIf: inState(state, 'gameOver'),
  });

  const isPlaying = inState(state, 'playing');

  world.addSystem(createPlayerEcsSystem(moveInput, time), { runIf: isPlaying });
  world.addSystem(
    createStarSpawnerEcsSystem(
      state,
      round,
      starSprite,
      playArea,
      new Random(),
      time,
    ),
    { runIf: isPlaying },
  );
  world.addSystem(createStarEcsSystem(state, round, playArea, time), {
    runIf: isPlaying,
  });
  world.addSystem(createHudEcsSystem(round), { runIf: isPlaying });

  // These run in every state.
  world.addSystem(createCameraEcsSystem(time));
  world.addSystem(createTransformEcsSystem());
  world.addSystem(createTextShapingEcsSystem());
  world.addSystem(createRenderEcsSystem(renderContext));

  return game;
};
