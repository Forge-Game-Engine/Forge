import {
  addPositionComponent,
  createTransformEcsSystem,
} from '@forge-game-engine/forge/common';
import { EcsWorld } from '@forge-game-engine/forge/ecs';
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
} from '@forge-game-engine/forge/text';
import {
  createLabel,
  createPanel,
  createUiCanvas,
  defaultUiRenderCategory,
  UiAnchor,
} from '@forge-game-engine/forge/ui';
import { createGame, Game } from '@forge-game-engine/forge/utilities';
import { DEMO_VERTICAL_WORLD_UNITS } from '@site/src/utils/demo-camera';
import { getAssetUrl } from '@site/src/utils/get-asset-url';

const renderLayers = {
  world: 1 << 0,
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
 * Builds the UI layout demo: a "game world" (a plain tinted backdrop, drawn
 * by its own camera/culling mask) with a HUD overlaid on top of it through
 * a second, dedicated UI camera - a full-width top bar and a corner-anchored
 * score panel, both holding their layout correctly no matter the canvas's
 * size or aspect ratio (see `createUiLayoutEcsSystem`'s full-recompute-every-
 * frame resolve). The HUD is presentational only - no buttons, no hover -
 * pointer/gamepad interaction lands in a later phase (see
 * `design/ui-system.md`).
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

  const canvas = createUiCanvas(world, renderContext, {
    referenceResolution: { x: 1920, y: 1080 },
  });

  const panelImage = await renderContext.imageCache.getOrLoad(
    getAssetUrl('img/kenney_fantasy-ui-borders/PNG/Double/Panel/panel-030.png'),
  );
  const panelSprite = createImageSprite(panelImage, renderContext, {
    layer: defaultUiRenderCategory,
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
    verticalAlign: 'middle',
    color: textColor,
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
    verticalAlign: 'middle',
    color: textColor,
  });

  world.addSystem(createCameraEcsSystem(time));
  world.addSystem(createTransformEcsSystem());
  world.addSystem(createTextShapingEcsSystem(renderContext));
  world.addSystem(createRenderEcsSystem(renderContext));
  world.addSystem(createPresentEcsSystem(renderContext));

  return game;
};
