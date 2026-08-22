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
  FontAtlasCache,
  textHorizontalAlignments,
  textVerticalAlignments,
} from '@forge-game-engine/forge/text';
import {
  createLabel,
  createPanel,
  createUiCanvas,
  UiAnchor,
  UiAnchorPreset,
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

const textColor = new Color(0.12, 0.12, 0.16, 1);

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
 * Builds the anchors demo: five panels, each labeled with the `UiAnchor`
 * preset that places it - a full-width top bar (`stretchTop`), and four
 * corner-pinned panels (`topLeft`/`topRight`/`bottomLeft`/`bottomRight`),
 * plus one centered panel (`center`). Every panel resolves its layout fresh
 * every frame from the canvas's current aspect ratio, so toggling
 * fullscreen keeps all of them exactly where their anchor says they should
 * be, at any window shape.
 * @param fontAtlasUrl - The URL of the font atlas JSON to load.
 * @returns The created game.
 */
export const createAnchorsGame = async (fontAtlasUrl: string): Promise<Game> => {
  const { game, world, renderContext, time } = createGame('demo-game');

  createCamera(world, {
    isStatic: true,
    cullingMask: renderLayers.world,
    verticalWorldUnits: DEMO_VERTICAL_WORLD_UNITS,
  });

  await createBackdrop(world, renderContext);

  const fontAtlasCache = new FontAtlasCache(renderContext.imageCache);
  const fontAtlas = await fontAtlasCache.getOrLoad(fontAtlasUrl);

  const canvas = createUiCanvas(world, renderContext, time, {
    cullingMask: renderLayers.ui,
    referenceResolution: { x: 1920, y: 1080 },
  });

  const panelImage = await renderContext.imageCache.getOrLoad(
    getAssetUrl('img/kenney_fantasy-ui-borders/PNG/Double/Panel/panel-030.png'),
  );
  const panelSprite = createImageSprite(panelImage, renderContext, {
    layer: renderLayers.ui,
    slices: {
      left: 26,
      right: 26,
      top: 26,
      bottom: 26,
      nativeWidth: 96,
      nativeHeight: 96,
    },
  });

  const labeledPanel = (
    text: string,
    anchor: UiAnchorPreset,
    anchoredPosition: { x: number; y: number },
    sizeDelta: { x: number; y: number },
  ): void => {
    const panel = createPanel(world, canvas, {
      anchor,
      anchoredPosition,
      sizeDelta,
      sprite: panelSprite,
    });

    createLabel(world, panel, {
      text,
      fontAtlas,
      size: 24,
      anchor: UiAnchor.stretchAll,
      sizeDelta: { x: 0, y: 0 },
      horizontalAlign: textHorizontalAlignments.center,
      verticalAlign: textVerticalAlignments.middle,
      color: textColor,
      category: renderLayers.ui,
    });
  };

  labeledPanel(
    'stretchTop',
    UiAnchor.stretchTop,
    { x: 0, y: -20 },
    { x: -40, y: 96 },
  );
  labeledPanel(
    'topLeft',
    UiAnchor.topLeft,
    { x: 20, y: -140 },
    { x: 260, y: 96 },
  );
  labeledPanel(
    'topRight',
    UiAnchor.topRight,
    { x: -20, y: -140 },
    { x: 260, y: 96 },
  );
  labeledPanel(
    'bottomLeft',
    UiAnchor.bottomLeft,
    { x: 20, y: 20 },
    { x: 260, y: 96 },
  );
  labeledPanel(
    'bottomRight',
    UiAnchor.bottomRight,
    { x: -20, y: 20 },
    { x: 260, y: 96 },
  );
  labeledPanel('center', UiAnchor.center, { x: 0, y: 0 }, { x: 260, y: 96 });

  world.addSystem(createCameraEcsSystem(time));
  world.addSystem(createTransformEcsSystem());
  world.addSystem(createTextShapingEcsSystem(renderContext));
  world.addSystem(createRenderEcsSystem(renderContext));
  world.addSystem(createPresentEcsSystem(renderContext));

  return game;
};
