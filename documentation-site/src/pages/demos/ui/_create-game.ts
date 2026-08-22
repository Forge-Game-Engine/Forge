import {
  addPositionComponent,
  createTransformEcsSystem,
  Time,
} from '@forge-game-engine/forge/common';
import { EcsWorld } from '@forge-game-engine/forge/ecs';
import {
  actionResetTypes,
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
  SpriteEcsComponent,
} from '@forge-game-engine/forge/rendering';
import {
  createTextShapingEcsSystem,
  FontAtlas,
  FontAtlasCache,
  textHorizontalAlignments,
  textId,
  textVerticalAlignments,
} from '@forge-game-engine/forge/text';
import {
  createButton,
  createDropdown,
  createLabel,
  createPanel,
  createProgressBar,
  createSlider,
  createToggle,
  createUiCanvas,
  UiAnchor,
  UiProgressBarEcsComponent,
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
  const navigateInput = new Axis2dAction(
    'ui-navigate',
    undefined,
    actionResetTypes.noReset,
  );

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
 * Builds a "Settings" panel showcasing the Phase 3 controls - a mute
 * toggle, a volume slider, a quality dropdown, and a health progress bar -
 * anchored to the canvas's right edge, alongside the existing HUD/button
 * showcase.
 * @returns The health bar's `UiProgressBarEcsComponent`, so the caller can
 * drive it from elsewhere (the demo ties it to the `Play` button below).
 */
async function createSettingsPanel(
  world: EcsWorld,
  renderContext: RenderContext,
  canvas: number,
  fontAtlas: FontAtlas,
  panelSprite: SpriteEcsComponent,
): Promise<UiProgressBarEcsComponent> {
  const whiteImage = await renderContext.imageCache.getOrLoad(
    getAssetUrl('img/White.png'),
  );

  // A round coin icon and an "X" icon, standing in for real game art - used
  // below for the slider handle and the toggle's checkmark, so this panel
  // demonstrates a distinctly-shaped image sprite (not just a tinted flat
  // rectangle like every other control here) for at least one of each kind
  // of graphic these controls accept.
  const handleImage = await renderContext.imageCache.getOrLoad(
    getAssetUrl('img/kenney_puzzle-pack-2/PNG/Coins/coin_01.png'),
  );
  const crossImage = await renderContext.imageCache.getOrLoad(
    getAssetUrl('img/space-shooter/icon_crossSmall.png'),
  );

  // A grey-to-yellow gradient strip, used below for the Health bar's fill -
  // like the coin/cross above, a genuine textured image sprite rather than
  // another flat tinted rectangle, this time for `fillSprite` specifically.
  // `createUiLayoutEcsSystem` stretches every sprite to its resolved rect
  // regardless of the source image's own size, so this thin 100x5 source
  // stretches cleanly across the bar with no tiling/repeat involved.
  const healthFillImage = await renderContext.imageCache.getOrLoad(
    getAssetUrl('img/Burn_Gradient.png'),
  );

  const buildFillSprite = (tintColor: Color): SpriteEcsComponent => {
    const sprite = createImageSprite(whiteImage, renderContext, {
      layer: renderLayers.ui,
    });
    sprite.tintColor = tintColor;

    return sprite;
  };

  const accentColor = new Color(0.35, 0.55, 0.95, 1);
  const boxColor = new Color(0.85, 0.85, 0.88, 1);
  const captionSize = 22;

  // The nine-sliced panelSprite's corner decorations are sized for large
  // panels/buttons - at the small sizes controls below use, the corners
  // would overlap into a mess, so small controls use a plain flat sprite
  // instead.
  const boxSprite = buildFillSprite(boxColor);

  // createButton/createToggle/createSlider always attach a
  // UiColorTransitionEcsComponent, which defaults every state to
  // Color.white - without this override, it would override boxSprite's
  // tint back to white every frame, on top of whatever tint the sprite
  // itself was given.
  const boxTransition = {
    normalColor: boxColor,
    hoverColor: new Color(0.78, 0.78, 0.83, 1),
    pressedColor: new Color(0.68, 0.68, 0.75, 1),
    disabledColor: new Color(0.6, 0.6, 0.6, 0.6),
  };

  const settingsPanel = createPanel(world, canvas, {
    anchor: UiAnchor.middleRight,
    anchoredPosition: { x: -20, y: 0 },
    sizeDelta: { x: 420, y: 600 },
    sprite: panelSprite,
  });

  createLabel(world, settingsPanel, {
    text: 'Settings',
    fontAtlas,
    size: 30,
    anchor: UiAnchor.stretchTopLeft,
    // A stretch anchor's default sizeDelta ({100, 100}) is a margin, not a
    // literal size - omitting this widens maxWidth past the panel's actual
    // width by 100, off-centering the text (see createToggle's checkmark
    // for the same gotcha with a sprite instead of text).
    sizeDelta: { x: 0, y: 0 },
    anchoredPosition: { x: 0, y: -30 },
    horizontalAlign: textHorizontalAlignments.center,
    verticalAlign: textVerticalAlignments.middle,
    color: textColor,
    category: renderLayers.ui,
  });

  const caption = (text: string, y: number): void => {
    createLabel(world, settingsPanel, {
      text,
      fontAtlas,
      size: captionSize,
      anchor: UiAnchor.topLeft,
      anchoredPosition: { x: 30, y },
      verticalAlign: textVerticalAlignments.middle,
      color: textColor,
      category: renderLayers.ui,
    });
  };

  caption('Mute', -90);

  const crossSprite = createImageSprite(crossImage, renderContext, {
    layer: renderLayers.ui,
  });
  crossSprite.tintColor = accentColor;

  createToggle(world, settingsPanel, {
    sprite: boxSprite,
    checkmarkSprite: crossSprite,
    anchor: UiAnchor.topLeft,
    anchoredPosition: { x: 340, y: -90 },
    transition: boxTransition,
  });

  caption('Volume', -160);

  const volumeValueLabel = createLabel(world, settingsPanel, {
    text: '75',
    fontAtlas,
    size: captionSize,
    anchor: UiAnchor.topLeft,
    anchoredPosition: { x: 340, y: -160 },
    verticalAlign: textVerticalAlignments.middle,
    color: textColor,
    category: renderLayers.ui,
  });
  const volumeValueText = world.getComponent(volumeValueLabel, textId)!;

  const volumeSlider = createSlider(world, settingsPanel, {
    trackSprite: boxSprite,
    handleSprite: createImageSprite(handleImage, renderContext, {
      layer: renderLayers.ui,
    }),
    fillSprite: buildFillSprite(accentColor),
    anchor: UiAnchor.topLeft,
    anchoredPosition: { x: 30, y: -190 },
    sizeDelta: { x: 360, y: 20 },
    minValue: 0,
    maxValue: 100,
    value: 75,
    wholeNumbers: true,
    transition: boxTransition,
  });

  volumeSlider.onValueChanged.registerListener((value) => {
    volumeValueText.text = `${value}`;
  });

  caption('Health', -250);

  const healthBar = createProgressBar(world, settingsPanel, {
    trackSprite: boxSprite,
    fillSprite: createImageSprite(healthFillImage, renderContext, {
      layer: renderLayers.ui,
    }),
    anchor: UiAnchor.topLeft,
    anchoredPosition: { x: 30, y: -280 },
    sizeDelta: { x: 360, y: 20 },
    minValue: 0,
    maxValue: 100,
    value: 100,
  });

  caption('Quality', -350);

  // Placed last, at the panel's bottom edge, so its option list - which
  // extends below the header while open - overlaps empty canvas space
  // rather than the sections above (there's no rect clipping yet, see the
  // UI doc's "Known limitations").
  createDropdown(world, settingsPanel, {
    headerSprite: boxSprite,
    optionSprite: boxSprite,
    options: ['Low', 'Medium', 'High'],
    fontAtlas,
    labelColor: textColor,
    labelCategory: renderLayers.ui,
    anchor: UiAnchor.topLeft,
    anchoredPosition: { x: 30, y: -380 },
    sizeDelta: { x: 240, y: 48 },
    selectedIndex: 2,
    transition: boxTransition,
  });

  return healthBar.progressBar;
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
export const createUiDemoGame = async (fontAtlasUrl: string): Promise<Game> => {
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

  createLabel(world, topBar, {
    text: 'Forge UI Demo',
    fontAtlas,
    size: 40,
    anchor: UiAnchor.stretchHorizontalLeft,
    // See the "Settings" label's own comment above for why this is needed.
    sizeDelta: { x: 0, y: 0 },
    horizontalAlign: textHorizontalAlignments.center,
    verticalAlign: textVerticalAlignments.middle,
    color: textColor,
    category: renderLayers.ui,
  });

  const scorePanel = createPanel(world, canvas, {
    anchor: UiAnchor.topLeft,
    anchoredPosition: { x: 20, y: -136 },
    sizeDelta: { x: 260, y: 96 },
    sprite: panelSprite,
  });

  createLabel(world, scorePanel, {
    text: 'Score: 1234',
    fontAtlas,
    size: 28,
    anchor: UiAnchor.stretchHorizontalLeft,
    // See the "Settings" label's own comment above for why this is needed.
    sizeDelta: { x: 0, y: 0 },
    horizontalAlign: textHorizontalAlignments.center,
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

  const healthProgressBar = await createSettingsPanel(
    world,
    renderContext,
    canvas,
    fontAtlas,
    panelSprite,
  );

  let clickCount = 0;

  const clickLabelWidth = 400;

  // `UiAnchor.bottomCenter`'s pivot sits at the box's own center, which
  // `maxWidth`-based centering needs to *not* be the case (see
  // `UiAnchor.stretchHorizontalLeft`'s doc comment) - a custom point anchor
  // keeps the same bottom-center placement (the anchor reference point)
  // while pivoting the box itself to its left edge instead, offsetting
  // `anchoredPosition.x` by half the box's own (fixed, known) width to land
  // in the same place visually.
  const clickLabel = createLabel(world, canvas, {
    text: 'Clicks: 0',
    fontAtlas,
    size: 24,
    anchor: {
      anchorMin: { x: 0.5, y: 0 },
      anchorMax: { x: 0.5, y: 0 },
      pivot: { x: 0, y: 0 },
    },
    anchoredPosition: { x: -clickLabelWidth / 2, y: 140 },
    sizeDelta: { x: clickLabelWidth, y: 40 },
    horizontalAlign: textHorizontalAlignments.center,
    verticalAlign: textVerticalAlignments.middle,
    maxWidth: clickLabelWidth,
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

    // Demonstrates createUiProgressBarEcsSystem picking up an external
    // value write the same frame it's set - unlike a slider, which has to
    // wait a frame for the interaction pipeline.
    healthProgressBar.value =
      healthProgressBar.value <= 0 ? 100 : healthProgressBar.value - 10;
  });

  world.addSystem(createCameraEcsSystem(time));
  world.addSystem(createTransformEcsSystem());
  world.addSystem(createTextShapingEcsSystem(renderContext));
  world.addSystem(createRenderEcsSystem(renderContext));
  world.addSystem(createPresentEcsSystem(renderContext));

  return game;
};
