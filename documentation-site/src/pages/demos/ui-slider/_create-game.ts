import {
  addPositionComponent,
  createTransformEcsSystem,
  Time,
} from '@forge-game-engine/forge/common';
import { EcsWorld } from '@forge-game-engine/forge/ecs';
import {
  MouseInputSource,
  registerInputs,
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
  textId,
  textVerticalAlignments,
} from '@forge-game-engine/forge/text';
import {
  createLabel,
  createSlider,
  createUiCanvas,
  UiAnchor,
} from '@forge-game-engine/forge/ui';
import { createGame, Game } from '@forge-game-engine/forge/utilities';
import { DEMO_VERTICAL_WORLD_UNITS } from '@site/src/utils/demo-camera';
import { getAssetUrl } from '@site/src/utils/get-asset-url';

const renderLayers = {
  world: 1 << 0,
  ui: 1 << 1,
};

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

function createPointerInput(
  world: EcsWorld,
  time: Time,
  game: Game,
): MouseInputSource {
  const inputManager = registerInputs(world, time, {});

  return new MouseInputSource(inputManager, game.container);
}

/**
 * Builds the slider demo: a single `createSlider` track with a handle and
 * fill, driving a live value label. The whole track is the drag surface -
 * clicking anywhere on it, not just the handle, jumps the handle there.
 * @param fontAtlasUrl - The URL of the font atlas JSON to load.
 * @returns The created game.
 */
export const createSliderGame = async (fontAtlasUrl: string): Promise<Game> => {
  const { game, world, renderContext, time } = createGame('demo-game');

  createCamera(world, {
    isStatic: true,
    cullingMask: renderLayers.world,
    verticalWorldUnits: DEMO_VERTICAL_WORLD_UNITS,
  });

  await createBackdrop(world, renderContext);

  const fontAtlasCache = new FontAtlasCache(renderContext.imageCache);
  const fontAtlas: FontAtlas = await fontAtlasCache.getOrLoad(fontAtlasUrl);

  const mouseInputSource = createPointerInput(world, time, game);

  const canvas = createUiCanvas(world, renderContext, time, {
    cullingMask: renderLayers.ui,
    referenceResolution: { x: 1920, y: 1080 },
    pointerSource: mouseInputSource,
  });

  const whiteImage = await renderContext.imageCache.getOrLoad(
    getAssetUrl('img/White.png'),
  );
  const handleImage = await renderContext.imageCache.getOrLoad(
    getAssetUrl('img/kenney_puzzle-pack-2/PNG/Coins/coin_01.png'),
  );

  const trackColor = new Color(0.85, 0.85, 0.88, 1);
  const accentColor = new Color(0.35, 0.55, 0.95, 1);

  const trackSprite = createImageSprite(whiteImage, renderContext, {
    layer: renderLayers.ui,
  });
  trackSprite.tintColor = trackColor;

  const fillSprite = createImageSprite(whiteImage, renderContext, {
    layer: renderLayers.ui,
  });
  fillSprite.tintColor = accentColor;

  const trackTransition = {
    normalColor: trackColor,
    hoverColor: new Color(0.78, 0.78, 0.83, 1),
    pressedColor: new Color(0.68, 0.68, 0.75, 1),
    disabledColor: new Color(0.6, 0.6, 0.6, 0.6),
  };

  createLabel(world, canvas, {
    text: 'Volume',
    fontAtlas,
    size: 28,
    anchor: UiAnchor.center(),
    anchoredPosition: { x: -260, y: 60 },
    verticalAlign: textVerticalAlignments.middle,
    color: Color.white,
    category: renderLayers.ui,
  });

  const valueLabel = createLabel(world, canvas, {
    text: '75',
    fontAtlas,
    size: 28,
    anchor: UiAnchor.center(),
    anchoredPosition: { x: 260, y: 60 },
    verticalAlign: textVerticalAlignments.middle,
    color: Color.white,
    category: renderLayers.ui,
  });
  const valueText = world.getComponent(valueLabel, textId)!;

  const slider = createSlider(world, canvas, {
    trackSprite,
    handleSprite: createImageSprite(handleImage, renderContext, {
      layer: renderLayers.ui,
    }),
    fillSprite,
    anchor: UiAnchor.center({ x: 500, y: 28 }),
    anchoredPosition: { x: 0, y: 0 },
    minValue: 0,
    maxValue: 100,
    value: 75,
    wholeNumbers: true,
    transition: trackTransition,
  });

  slider.onValueChanged.registerListener((value) => {
    valueText.text = `${value}`;
  });

  world.addSystem(createCameraEcsSystem(time));
  world.addSystem(createTransformEcsSystem());
  world.addSystem(createTextShapingEcsSystem(renderContext));
  world.addSystem(createRenderEcsSystem(renderContext));
  world.addSystem(createPresentEcsSystem(renderContext));

  return game;
};
