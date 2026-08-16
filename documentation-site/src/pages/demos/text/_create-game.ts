import {
  calculateVisibleWorldSize,
  createCamera,
  createCameraEcsSystem,
  createImageSprite,
  createRenderEcsSystem,
} from '@forge-game-engine/forge/rendering';
import {
  createTextShapingEcsSystem,
  FontAtlasCache,
} from '@forge-game-engine/forge/text';
import { createGame, Game } from '@forge-game-engine/forge/utilities';
import { getAssetUrl } from '@site/src/utils/get-asset-url';
import { DEMO_VERTICAL_WORLD_UNITS } from '@site/src/utils/demo-camera';
import { createHorizontalAlignmentExamples } from './_create-horizontal-alignment-examples';
import { createLineHeightExamples } from './_create-line-height-examples';
import { createLiveMaxWidthExample } from './_create-live-max-width-example';
import { createVerticalAlignmentExamples } from './_create-vertical-alignment-examples';
import { createLiveMaxWidthEcsSystem } from './_live-max-width.system';

const renderLayers = {
  foreground: 1 << 0,
};

// Draw-order (not culling) layers: guide boxes/lines are drawn first so the
// text painted at `content` always ends up on top of them, regardless of
// how their world positions happen to compare.
const drawOrder = {
  guide: 0,
  content: 1,
};

const margin = 24;
const sectionGap = 26;

/**
 * Builds the text rendering demo: a showcase of every `horizontalAlign` and
 * `verticalAlign` value, a comparison of a few `lineHeight` multipliers, and
 * a paragraph whose `maxWidth` oscillates every frame to show
 * `createTextShapingEcsSystem` reflowing text live, all drawn from one
 * shared `FontAtlas` loaded from `fontAtlasUrl`.
 * @param fontAtlasUrl - The URL of the font atlas JSON to load (see
 * `index.tsx`, which resolves this against the site's configured base URL).
 * @returns The created game.
 */
export const createTextGame = async (fontAtlasUrl: string): Promise<Game> => {
  const { game, world, renderContext, time } = createGame('demo-game');

  createCamera(world, {
    isStatic: true,
    cullingMask: renderLayers.foreground,
    verticalWorldUnits: DEMO_VERTICAL_WORLD_UNITS,
  });

  const fontAtlasCache = new FontAtlasCache(renderContext.imageCache);
  const fontAtlas = await fontAtlasCache.getOrLoad(fontAtlasUrl);

  const whiteImage = await renderContext.imageCache.getOrLoad(
    getAssetUrl('img/White.png'),
  );
  const whiteSprite = createImageSprite(whiteImage, renderContext, {
    layer: renderLayers.foreground,
  });

  const { x: width, y: height } = calculateVisibleWorldSize(
    renderContext.width,
    renderContext.height,
    DEMO_VERTICAL_WORLD_UNITS,
  );
  const usableWidth = width - margin * 2;
  const left = -usableWidth / 2;
  let y = height / 2 - margin;

  y = createHorizontalAlignmentExamples(
    world,
    fontAtlas,
    whiteSprite,
    drawOrder.guide,
    drawOrder.content,
    { x: left, y },
    usableWidth,
  );
  y -= sectionGap;

  y = createVerticalAlignmentExamples(
    world,
    fontAtlas,
    whiteSprite,
    drawOrder.guide,
    drawOrder.content,
    { x: left, y },
    usableWidth,
  );
  y -= sectionGap;

  y = createLineHeightExamples(
    world,
    fontAtlas,
    whiteSprite,
    drawOrder.guide,
    drawOrder.content,
    { x: left, y },
    usableWidth,
  );
  y -= sectionGap;

  createLiveMaxWidthExample(
    world,
    fontAtlas,
    whiteSprite,
    drawOrder.guide,
    drawOrder.content,
    { x: left, y },
    usableWidth,
  );

  world.addSystem(createCameraEcsSystem(time));
  world.addSystem(createLiveMaxWidthEcsSystem(time));
  world.addSystem(createTextShapingEcsSystem(renderContext));
  world.addSystem(createRenderEcsSystem(renderContext));

  return game;
};
