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
import { createEffectsExamples } from './_create-effects-examples';
import { createEffectsHeroExample } from './_create-effects-hero-example';
import { createHorizontalAlignmentExamples } from './_create-horizontal-alignment-examples';
import { createLineHeightExamples } from './_create-line-height-examples';
import { createLiveMaxWidthExample } from './_create-live-max-width-example';
import { createVerticalAlignmentExamples } from './_create-vertical-alignment-examples';
import { createLiveMaxWidthEcsSystem } from './_live-max-width.system';
import { createPlayground, Playground } from './_create-playground';

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
const sectionGap = 16;

/**
 * Builds the text rendering demo: a showcase of every `horizontalAlign` and
 * `verticalAlign` value, a comparison of a few `lineHeight` multipliers, a
 * paragraph whose `maxWidth` oscillates every frame to show
 * `createTextShapingEcsSystem` reflowing text live, an interactive
 * playground, and an outline/soft-shadow showcase, all drawn from one
 * shared `FontAtlas` loaded from `fontAtlasUrl`.
 * @param fontAtlasUrl - The URL of the font atlas JSON to load (see
 * `index.tsx`, which resolves this against the site's configured base URL).
 * @param onPlaygroundReady - Called once the playground's live
 * `TextEcsComponent` exists, so `index.tsx`'s controls can mutate it
 * directly (mirroring how other demos hand a live component back to React,
 * e.g. the space-shooter demo's `onBloomReady`).
 * @returns The created game.
 */
export const createTextGame = async (
  fontAtlasUrl: string,
  onPlaygroundReady: (playground: Playground) => void,
): Promise<Game> => {
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

  y = createLiveMaxWidthExample(
    world,
    fontAtlas,
    whiteSprite,
    drawOrder.guide,
    drawOrder.content,
    { x: left, y },
    usableWidth,
  );
  y -= sectionGap;

  const playground = createPlayground(
    world,
    fontAtlas,
    whiteSprite,
    drawOrder.guide,
    drawOrder.content,
    { x: left, y },
    usableWidth,
  );
  onPlaygroundReady(playground);
  y = playground.bottom;
  y -= sectionGap;

  y = createEffectsExamples(
    world,
    fontAtlas,
    whiteSprite,
    drawOrder.guide,
    drawOrder.content,
    { x: left, y },
    usableWidth,
  );
  y -= sectionGap;

  createEffectsHeroExample(
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
