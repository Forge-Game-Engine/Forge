import {
  addPositionComponent,
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
  createTexture,
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
  registerUiSystems,
  UiAnchor,
} from '@forge-game-engine/forge/ui';
import { createGame, Game } from '@forge-game-engine/forge/utilities';
import { getAssetUrl } from '@site/src/utils/get-asset-url';

const renderLayers = {
  world: 1 << 0,
  ui: 1 << 1,
};

async function createBackdrop(
  world: EcsWorld,
  renderContext: RenderContext,
): Promise<void> {
  const backdropSprite = {
    ...createImageSprite(renderContext.whiteTexture, { pixelsPerUnit: 1 }),
    category: renderLayers.world,
  };
  backdropSprite.tintColor = new Color(0.09, 0.11, 0.16, 1);
  backdropSprite.width = 512;
  backdropSprite.height = 512;

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
 * @returns The created game.
 */
export const createSliderGame = async (): Promise<Game> => {
  const { game, world, renderContext, time } = createGame('demo-game');

  createCamera(world, {
    isStatic: true,
    cullingMask: renderLayers.world,
  });

  await createBackdrop(world, renderContext);

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

  const mouseInputSource = createPointerInput(world, time, game);

  registerUiSystems(world, renderContext, time, {
    pointerSource: mouseInputSource,
  });

  const canvas = createUiCanvas(world, renderContext, {
    cullingMask: renderLayers.ui,
    referenceResolution: { x: 1920, y: 1080 },
  });

  const handleImage = await renderContext.imageCache.getOrLoad(
    getAssetUrl('img/kenney_ui-pack/PNG/Blue/Default/button_round_gloss.png'),
  );

  const trackColor = new Color(0.85, 0.85, 0.88, 1);
  const accentColor = new Color(0.75, 0.75, 0.15, 1);

  const trackSprite = {
    ...createImageSprite(renderContext.whiteTexture, { pixelsPerUnit: 1 }),
    category: renderLayers.ui,
  };
  trackSprite.tintColor = trackColor;

  const fillSprite = {
    ...createImageSprite(renderContext.whiteTexture, { pixelsPerUnit: 1 }),
    category: renderLayers.ui,
  };
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
    anchoredPosition: { x: 230, y: 60 },
    verticalAlign: textVerticalAlignments.middle,
    color: Color.white,
    category: renderLayers.ui,
  });
  const valueText = world.getComponent(valueLabel, textId)!;

  const slider = createSlider(world, canvas, {
    trackSprite,
    handleSprite: {
      ...createImageSprite(createTexture(renderContext, handleImage), {
        pixelsPerUnit: 1,
      }),
      category: renderLayers.ui,
    },
    handleSize: { x: 56, y: 56 },
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
  world.addSystem(createTextShapingEcsSystem());
  world.addSystem(createRenderEcsSystem(renderContext));
  world.addSystem(createPresentEcsSystem(renderContext));

  return game;
};
