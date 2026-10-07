import {
  addPositionComponent,
  addRotationComponent,
  addScaleComponent,
  createTransformEcsSystem,
  Time,
} from '@forge-game-engine/forge/common';
import { EcsWorld } from '@forge-game-engine/forge/ecs';
import defaultFontImageUrl from '@forge-game-engine/forge/fonts/default/default.png';
import {
  MouseInputSource,
  registerInputs,
} from '@forge-game-engine/forge/input';
import {
  addSpriteComponent,
  Color,
  createCamera,
  createCameraEcsSystem,
  createImageSprite,
  createPresentEcsSystem,
  createRenderEcsSystem,
  getCameraView,
  RenderContext,
  visibilityId,
} from '@forge-game-engine/forge/rendering';
import {
  createTextShapingEcsSystem,
  FontAtlas,
  FontAtlasCache,
  textVerticalAlignments,
} from '@forge-game-engine/forge/text';
import {
  createButton,
  createLabel,
  createSlider,
  createToggle,
  createUiCanvas,
  registerUiSystems,
  UiAnchor,
} from '@forge-game-engine/forge/ui';
import { createGame, Game } from '@forge-game-engine/forge/utilities';
import { DEMO_VERTICAL_WORLD_UNITS } from '@site/src/utils/demo-camera';
import { loadSettings, maxSize, minSize } from './_settings';
import { spinnerId } from './_spinner.component';
import { createSpinnerEcsSystem } from './_spinner.system';

const renderLayers = {
  world: 1 << 0,
  ui: 1 << 1,
};

const controlColor = new Color(0.85, 0.85, 0.88, 1);
const accentColor = new Color(0.35, 0.55, 0.95, 1);
const controlTransition = {
  normalColor: controlColor,
  hoverColor: new Color(0.78, 0.78, 0.83, 1),
  pressedColor: new Color(0.68, 0.68, 0.75, 1),
  disabledColor: new Color(0.6, 0.6, 0.6, 0.6),
};

async function createBackdrop(
  world: EcsWorld,
  camera: number,
  renderContext: RenderContext,
): Promise<void> {
  const backdropSprite = {
    ...createImageSprite(renderContext.whiteTexture, { pixelsPerUnit: 1 }),
    category: renderLayers.world,
  };
  backdropSprite.tintColor = new Color(0.09, 0.11, 0.16, 1);

  const { x: width, y: height } = getCameraView(
    world,
    camera,
    renderContext,
  ).size;

  backdropSprite.width = width;
  backdropSprite.height = height;

  const backdrop = world.createEntity();

  addPositionComponent(world, backdrop);
  addSpriteComponent(world, backdrop, backdropSprite);
}

function createPointerInput(
  world: EcsWorld,
  time: Time,
  game: Game,
): MouseInputSource {
  const inputManager = registerInputs(world, time, {});

  return new MouseInputSource(inputManager, game.container);
}

/**
 * Builds the persistent state demo: a settings panel whose size slider and
 * spin toggle are kept in a persistent state, so they survive a reload.
 * The settings are loaded before the game is created, written into the
 * square's `SpinnerEcsComponent`, and written again on every change.
 * @returns The created game.
 */
export const createPersistentStateGame = async (): Promise<Game> => {
  const { settings, isStored } = await loadSettings();

  const { game, world, renderContext, time } = createGame('demo-game');

  const camera = createCamera(world, {
    isStatic: true,
    cullingMask: renderLayers.world,
    verticalWorldUnits: DEMO_VERTICAL_WORLD_UNITS,
  });

  await createBackdrop(world, camera, renderContext);

  // The square reads its settings from a component, written from the
  // record. Changes go through `settings.set`, never the component.
  const squareSprite = {
    ...createImageSprite(renderContext.whiteTexture, { pixelsPerUnit: 1 }),
    category: renderLayers.world,
  };
  squareSprite.width = 120;
  squareSprite.height = 120;
  squareSprite.tintColor = accentColor;

  const square = world.createEntity();

  addPositionComponent(world, square, { local: { x: 220, y: 0 } });
  addRotationComponent(world, square);
  addScaleComponent(world, square);
  addSpriteComponent(world, square, squareSprite);
  world.addComponent(square, spinnerId, { ...settings.values, speed: 1.5 });

  settings.onChange.registerListener((values) => {
    Object.assign(world.getComponentRequired(square, spinnerId), values);
  });

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

  registerUiSystems(world, renderContext, time, {
    pointerSource: createPointerInput(world, time, game),
  });

  const canvas = createUiCanvas(world, renderContext, {
    cullingMask: renderLayers.ui,
    referenceResolution: { x: 1920, y: 1080 },
  });

  const caption = (text: string, y: number, size = 30): void => {
    createLabel(world, canvas, {
      text,
      fontAtlas,
      size,
      anchor: UiAnchor.topLeft({ x: 600, y: 40 }),
      anchoredPosition: { x: 60, y },
      verticalAlign: textVerticalAlignments.middle,
      color: Color.white,
      category: renderLayers.ui,
    });
  };

  const uiSprite = (tint: Color) => {
    const sprite = {
      ...createImageSprite(renderContext.whiteTexture, { pixelsPerUnit: 1 }),
      category: renderLayers.ui,
    };
    sprite.tintColor = tint;

    return sprite;
  };

  caption('Size', -80);

  const sizeSlider = createSlider(world, canvas, {
    trackSprite: uiSprite(controlColor),
    handleSprite: uiSprite(Color.white),
    handleSize: { x: 40, y: 40 },
    fillSprite: uiSprite(accentColor),
    anchor: UiAnchor.topLeft({ x: 400, y: 24 }),
    anchoredPosition: { x: 60, y: -130 },
    minValue: minSize,
    maxValue: maxSize,
    value: settings.values.size,
    transition: controlTransition,
  });

  sizeSlider.onValueChanged.registerListener((size) => {
    void settings.set({ size });
  });

  caption('Spin', -220);

  const spinToggle = createToggle(world, canvas, {
    sprite: uiSprite(controlColor),
    checkmarkSprite: uiSprite(accentColor),
    isOn: settings.values.spin,
    anchor: UiAnchor.topLeft({ x: 40, y: 40 }),
    anchoredPosition: { x: 160, y: -200 },
    transition: controlTransition,
  });

  spinToggle.onValueChanged.registerListener((spin) => {
    void settings.set({ spin });
  });

  const resetButton = createButton(world, canvas, {
    anchor: UiAnchor.topLeft({ x: 260, y: 64 }),
    anchoredPosition: { x: 60, y: -290 },
    sprite: uiSprite(Color.white),
    label: 'Reset',
    fontAtlas,
    labelSize: 26,
    labelColor: new Color(0.12, 0.12, 0.16, 1),
    labelCategory: renderLayers.ui,
    transition: controlTransition,
  });

  resetButton.onInvoke.registerListener(() => {
    void settings.reset();
  });

  // Writing a control's value directly doesn't raise its `onValueChanged`,
  // so the controls follow a reset without storing the defaults. The
  // toggle's checkmark only follows `onValueChanged`, so it's shown here.
  const checkmarkVisibility = world.getComponentRequired(
    spinToggle.checkmark,
    visibilityId,
  );

  settings.onChange.registerListener(({ size, spin }) => {
    sizeSlider.slider.value = size;
    spinToggle.toggle.isOn = spin;
    checkmarkVisibility.visible = spin;
  });

  caption(
    isStored
      ? 'Reload the page: the settings are kept.'
      : 'Storage is unavailable: the settings last for this visit.',
    -420,
    24,
  );

  world.addSystem(createSpinnerEcsSystem(time));
  world.addSystem(createCameraEcsSystem(time));
  world.addSystem(createTransformEcsSystem());
  world.addSystem(createTextShapingEcsSystem());
  world.addSystem(createRenderEcsSystem(renderContext));
  world.addSystem(createPresentEcsSystem(renderContext));

  return game;
};
