import {
  addPositionComponent,
  createTransformEcsSystem,
  Time,
} from '@forge-game-engine/forge/common';
import { EcsWorld } from '@forge-game-engine/forge/ecs';
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
  calculateVisibleWorldSize,
  Color,
  createCamera,
  createCameraEcsSystem,
  createImageSprite,
  createPresentEcsSystem,
  createRenderEcsSystem,
  RenderContext,
} from '@forge-game-engine/forge/rendering';
import {
  createTextShapingEcsSystem,
  FontAtlas,
  FontAtlasCache,
  shapeText,
  textHorizontalAlignments,
  textId,
  textVerticalAlignments,
} from '@forge-game-engine/forge/text';
import {
  createButton,
  createLabel,
  createPanel,
  createUiCanvas,
  UiAnchor,
} from '@forge-game-engine/forge/ui';
import { createGame, Game } from '@forge-game-engine/forge/utilities';
import { DEMO_VERTICAL_WORLD_UNITS } from '@site/src/utils/demo-camera';
import { getAssetUrl } from '@site/src/utils/get-asset-url';

// Forge doesn't ship a reserved "UI" render category - each game picks its
// own bit and reuses it for the UI canvas's cullingMask and every UI
// visual's own category, so it's this demo's choice, not the engine's,
// which bit separates the world camera from the UI camera.
const renderLayers = {
  world: 1 << 0,
  ui: 1 << 1,
};

// The panel artwork is a flat white fill, so labels need a dark tint to
// read against it.
const textColor = new Color(0.12, 0.12, 0.16, 1);

/** The panel artwork's own border, in texture pixels (see the nine-slice demo). */
const panelBorderInset = 26;
const panelNativeSize = 96;

/**
 * A center-pivoted `RectTransformEcsComponent` only centers the label
 * *entity* on its parent - text shaping always starts a line at the
 * entity's own position and grows right/down from there (horizontalAlign
 * only re-centers within an explicit `maxWidth` box, which isn't known
 * ahead of time for the stretched top bar here). Pre-measuring the shaped
 * width and offsetting `anchoredPosition.x` by half of it centers the text
 * itself on that same point instead, regardless of container width.
 */
function measureTextWidth(
  text: string,
  fontAtlas: FontAtlas,
  size: number,
): number {
  return shapeText(text, fontAtlas.data, { size }).bounds.width;
}

async function createBackdrop(
  world: EcsWorld,
  renderContext: RenderContext,
): Promise<void> {
  const whiteImage = await renderContext.imageCache.getOrLoad(
    getAssetUrl('img/White.png'),
  );
  const backdropSprite = createImageSprite(whiteImage, renderContext, {
    layer: renderLayers.world,
  });
  backdropSprite.tintColor = new Color(0.09, 0.11, 0.16, 1);

  const { x: width, y: height } = calculateVisibleWorldSize(
    renderContext.width,
    renderContext.height,
    DEMO_VERTICAL_WORLD_UNITS,
  );

  backdropSprite.width = width;
  backdropSprite.height = height;

  const backdrop = world.createEntity();

  addPositionComponent(world, backdrop);
  addSpriteComponent(world, backdrop, backdropSprite);
}

/**
 * Wires a `MouseInputSource` and a `KeyboardInputSource` (arrow keys to
 * navigate focus, Enter/Space to submit) so the HUD's `Play` button is both
 * clickable and gamepad/keyboard-focus-navigable.
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

/**
 * Builds the UI interaction demo: a "game world" (a plain tinted backdrop,
 * drawn by its own camera/culling mask) with a HUD overlaid on top of it
 * through a second, dedicated UI camera - a full-width top bar, a
 * corner-anchored score panel, and a hoverable, clickable, keyboard/gamepad-
 * focus-navigable `Play` button (see `createButton`) that increments a
 * click counter on `onInvoke`, whichever path raised it (pointer or
 * `submitInput`).
 * @param fontAtlasUrl - The URL of the font atlas JSON to load.
 * @returns The created game.
 */
export const createUiDemoGame = async (
  fontAtlasUrl: string,
): Promise<Game> => {
  const { game, world, renderContext, time } = createGame('demo-game');

  createCamera(world, {
    isStatic: true,
    cullingMask: renderLayers.world,
    verticalWorldUnits: DEMO_VERTICAL_WORLD_UNITS,
  });

  await createBackdrop(world, renderContext);

  const fontAtlasCache = new FontAtlasCache(renderContext.imageCache);
  const fontAtlas = await fontAtlasCache.getOrLoad(fontAtlasUrl);

  const { mouseInputSource, submitInput, navigateInput } = createUiInputs(
    world,
    time,
    game,
  );

  const canvas = createUiCanvas(world, renderContext, time, {
    cullingMask: renderLayers.ui,
    referenceResolution: { x: 1920, y: 1080 },
    pointerSource: mouseInputSource,
    submitInput,
    navigateInput,
  });

  const panelImage = await renderContext.imageCache.getOrLoad(
    getAssetUrl('img/kenney_fantasy-ui-borders/PNG/Double/Panel/panel-030.png'),
  );
  const panelSprite = createImageSprite(panelImage, renderContext, {
    layer: renderLayers.ui,
    slices: {
      left: panelBorderInset,
      right: panelBorderInset,
      top: panelBorderInset,
      bottom: panelBorderInset,
      nativeWidth: panelNativeSize,
      nativeHeight: panelNativeSize,
    },
  });

  const topBar = createPanel(world, canvas, {
    anchor: UiAnchor.stretchTop,
    sizeDelta: { x: -40, y: 96 },
    anchoredPosition: { x: 0, y: -20 },
    sprite: panelSprite,
  });

  const titleText = 'Forge UI Demo';
  const titleSize = 40;

  createLabel(world, topBar, {
    text: titleText,
    fontAtlas,
    size: titleSize,
    anchor: UiAnchor.center,
    anchoredPosition: {
      x: -measureTextWidth(titleText, fontAtlas, titleSize) / 2,
      y: 0,
    },
    verticalAlign: textVerticalAlignments.middle,
    color: textColor,
    category: renderLayers.ui,
  });

  const scorePanelWidth = 260;
  const scorePanel = createPanel(world, canvas, {
    anchor: UiAnchor.topLeft,
    anchoredPosition: { x: 20, y: -136 },
    sizeDelta: { x: scorePanelWidth, y: 96 },
    sprite: panelSprite,
  });

  const scoreText = 'Score: 1234';
  const scoreSize = 28;

  createLabel(world, scorePanel, {
    text: scoreText,
    fontAtlas,
    size: scoreSize,
    anchor: UiAnchor.center,
    anchoredPosition: {
      x: -measureTextWidth(scoreText, fontAtlas, scoreSize) / 2,
      y: 0,
    },
    verticalAlign: textVerticalAlignments.middle,
    color: textColor,
    category: renderLayers.ui,
  });

  const playButton = createButton(world, canvas, {
    anchor: UiAnchor.bottomCenter,
    anchoredPosition: { x: 0, y: 60 },
    sizeDelta: { x: 220, y: 72 },
    sprite: panelSprite,
    label: 'Play',
    fontAtlas,
    labelSize: 30,
    labelColor: textColor,
    labelCategory: renderLayers.ui,
    transition: {
      normalColor: Color.white,
      hoverColor: new Color(0.85, 0.85, 0.85, 1),
      pressedColor: new Color(0.65, 0.65, 0.65, 1),
      disabledColor: new Color(0.5, 0.5, 0.5, 0.6),
    },
  });

  let clickCount = 0;

  const clickLabel = createLabel(world, canvas, {
    text: 'Clicks: 0',
    fontAtlas,
    size: 24,
    anchor: UiAnchor.bottomCenter,
    anchoredPosition: { x: 0, y: 140 },
    sizeDelta: { x: 400, y: 40 },
    horizontalAlign: textHorizontalAlignments.center,
    verticalAlign: textVerticalAlignments.middle,
    maxWidth: 400,
    color: textColor,
    category: renderLayers.ui,
  });

  // Looked up once, rather than on every click - `world.getComponent` is a
  // map lookup that a hot input-event handler doesn't need to repeat when
  // the component reference itself never changes.
  const clickText = world.getComponent(clickLabel, textId)!;

  playButton.onInvoke.registerListener(() => {
    clickCount += 1;
    clickText.text = `Clicks: ${clickCount}`;
  });

  world.addSystem(createCameraEcsSystem(time));
  world.addSystem(createTransformEcsSystem());
  world.addSystem(createTextShapingEcsSystem(renderContext));
  world.addSystem(createRenderEcsSystem(renderContext));
  world.addSystem(createPresentEcsSystem(renderContext));

  return game;
};
