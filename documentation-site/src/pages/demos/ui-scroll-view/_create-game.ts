import {
  addPositionComponent,
  createTransformEcsSystem,
  Time,
} from '@forge-game-engine/forge/common';
import { EcsWorld } from '@forge-game-engine/forge/ecs';
import defaultFontImageUrl from '@forge-game-engine/forge/fonts/default/default.png';
import {
  Axis2dAction,
  buttonMoments,
  KeyboardAxis2dBinding,
  keyCodes,
  KeyboardInputSource,
  KeyboardTriggerBinding,
  MouseInputSource,
  registerInputs,
  TriggerAction,
} from '@forge-game-engine/forge/input';
import {
  addSpriteComponent,
  Color,
  createCamera,
  createCameraEcsSystem,
  createImageSprite,
  createPresentEcsSystem,
  createRenderEcsSystem,
  RenderContext,
  SpriteEcsComponent,
} from '@forge-game-engine/forge/rendering';
import {
  createTextShapingEcsSystem,
  FontAtlas,
  FontAtlasCache,
  textId,
  textVerticalAlignments,
} from '@forge-game-engine/forge/text';
import {
  createButton,
  createLabel,
  createScrollView,
  createUiCanvas,
  registerUiSystems,
  UiAnchor,
} from '@forge-game-engine/forge/ui';
import { createGame, Game } from '@forge-game-engine/forge/utilities';

const renderLayers = {
  world: 1 << 0,
  ui: 1 << 1,
};

const levelCount = 30;

function createBackdrop(world: EcsWorld, renderContext: RenderContext): void {
  const backdropSprite = {
    ...createImageSprite(renderContext.whiteTexture, { pixelsPerUnit: 1 }),
    category: renderLayers.world,
  };
  backdropSprite.tintColor = new Color(0.09, 0.11, 0.16, 1);
  backdropSprite.width = 4096;
  backdropSprite.height = 4096;

  const backdrop = world.createEntity();

  addPositionComponent(world, backdrop);
  addSpriteComponent(world, backdrop, backdropSprite);
}

/**
 * Wires a mouse (drag, wheel and click) and the keyboard (arrow keys move
 * focus, Enter/Space invoke) to the UI.
 */
function createUiInputs(
  world: EcsWorld,
  time: Time,
  game: Game,
): {
  mouseInputSource: MouseInputSource;
  submitInput: TriggerAction;
  navigateInput: Axis2dAction;
} {
  const submitInput = new TriggerAction('ui-submit');
  const navigateInput = new Axis2dAction('ui-navigate');

  const inputManager = registerInputs(world, time, {
    triggerActions: [submitInput],
    axis2dActions: [navigateInput],
  });

  const mouseInputSource = new MouseInputSource(inputManager, game.container);
  const keyboardInputSource = new KeyboardInputSource(inputManager);

  keyboardInputSource.axis2dBindings.add(
    new KeyboardAxis2dBinding(
      navigateInput,
      keyCodes.arrowUp,
      keyCodes.arrowDown,
      keyCodes.arrowRight,
      keyCodes.arrowLeft,
    ),
  );
  keyboardInputSource.triggerBindings.add(
    new KeyboardTriggerBinding(submitInput, keyCodes.enter, buttonMoments.down),
  );
  keyboardInputSource.triggerBindings.add(
    new KeyboardTriggerBinding(submitInput, keyCodes.space, buttonMoments.down),
  );

  return { mouseInputSource, submitInput, navigateInput };
}

function createUiSprite(
  renderContext: RenderContext,
  tintColor: Color,
): SpriteEcsComponent {
  const sprite = {
    ...createImageSprite(renderContext.whiteTexture, { pixelsPerUnit: 1 }),
    category: renderLayers.ui,
  };
  sprite.tintColor = tintColor;

  return sprite;
}

/**
 * Builds the scroll view demo: a level list of 30 buttons in a
 * `createScrollView`, with a scrollbar. Drag the list (on a button or
 * between them), turn the mouse wheel, drag the scrollbar, or move focus
 * with the arrow keys - the list follows the focused button.
 * @returns The created game.
 */
export const createScrollViewGame = async (): Promise<Game> => {
  const { game, world, renderContext, time } = createGame('demo-game');

  createCamera(world, {
    isStatic: true,
    cullingMask: renderLayers.world,
  });

  createBackdrop(world, renderContext);

  const fontAtlasCache = new FontAtlasCache(renderContext);
  const fontAtlas: FontAtlas = await fontAtlasCache.getOrLoad({
    // Importing the JSON would give its parsed contents, so `new URL` asks
    // webpack for its URL instead.
    metricsUrl: new URL(
      '@forge-game-engine/forge/fonts/default/default.json',
      import.meta.url,
    ).href,
    imageUrl: defaultFontImageUrl,
  });

  const { mouseInputSource, submitInput, navigateInput } = createUiInputs(
    world,
    time,
    game,
  );

  registerUiSystems(world, renderContext, time, {
    pointerSource: mouseInputSource,
  });

  const canvas = createUiCanvas(world, renderContext, {
    cullingMask: renderLayers.ui,
    referenceResolution: { x: 1920, y: 1080 },
    submitInput,
    navigateInput,
  });

  const status = createLabel(world, canvas, {
    text: 'Pick a level',
    fontAtlas,
    size: 36,
    anchor: UiAnchor.center(),
    anchoredPosition: { x: -150, y: 420 },
    verticalAlign: textVerticalAlignments.middle,
    color: Color.white,
    category: renderLayers.ui,
  });
  const statusText = world.getComponent(status, textId)!;

  const levels = createScrollView(world, canvas, {
    anchor: UiAnchor.center({ x: 560, y: 720 }),
    anchoredPosition: { x: 0, y: -40 },
    sprite: createUiSprite(renderContext, new Color(0.16, 0.19, 0.26, 1)),
    layout: {
      padding: { left: 16, right: 16, top: 16, bottom: 16 },
      spacing: 12,
    },
    scrollbarSprite: createUiSprite(
      renderContext,
      new Color(0.12, 0.14, 0.2, 1),
    ),
    scrollbarHandleSprite: createUiSprite(
      renderContext,
      new Color(0.55, 0.6, 0.72, 1),
    ),
    scrollbarWidth: 20,
  });

  const buttonColor = new Color(0.85, 0.85, 0.88, 1);

  for (let level = 1; level <= levelCount; level++) {
    const button = createButton(world, levels.content, {
      sprite: createUiSprite(renderContext, buttonColor),
      label: `Level ${level}`,
      fontAtlas,
      labelSize: 28,
      labelColor: new Color(0.12, 0.12, 0.16, 1),
      labelCategory: renderLayers.ui,
      anchor: UiAnchor.center({ x: 400, y: 72 }),
      transition: {
        normalColor: buttonColor,
        hoverColor: new Color(0.75, 0.75, 0.15, 1),
        pressedColor: new Color(0.6, 0.6, 0.1, 1),
        disabledColor: new Color(0.5, 0.5, 0.5, 0.6),
      },
    });

    button.onInvoke.registerListener(() => {
      statusText.text = `Level ${level} selected`;
    });
  }

  world.addSystem(createCameraEcsSystem(time));
  world.addSystem(createTransformEcsSystem());
  world.addSystem(createTextShapingEcsSystem());
  world.addSystem(createRenderEcsSystem(renderContext));
  world.addSystem(createPresentEcsSystem(renderContext));

  return game;
};
