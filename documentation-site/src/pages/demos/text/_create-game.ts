import { loadFontAtlas } from '@forge-game-engine/forge/asset-loading';
import { SystemRegistrationOrder } from '@forge-game-engine/forge/ecs';
import {
  createCamera,
  createCameraEcsSystem,
  createMsdfTextRenderable,
  createRenderEcsSystem,
} from '@forge-game-engine/forge/rendering';
import { createTextShapingEcsSystem } from '@forge-game-engine/forge/text';
import { createGame, Game } from '@forge-game-engine/forge/utilities';
import { DEMO_VERTICAL_WORLD_UNITS } from '@site/src/utils/demo-camera';
import { createElapsedCounterEcsSystem } from './_elapsed-counter.system';
import { createLabels } from './_create-labels';

const renderLayers = {
  foreground: 1 << 0,
};

/**
 * Builds the Text demo: loads a Liberation Sans MSDF font atlas, builds its
 * shared renderable, and lays out a few showcase labels (see
 * `_create-labels.ts`) - a title/byline, three word-wrapped paragraphs
 * (one per alignment), and a live elapsed-time counter.
 * @param fontJsonUrl - The URL of the atlas's `msdf-atlas-gen` JSON metrics
 * file.
 * @param fontPngUrl - The URL of the atlas's PNG texture.
 * @returns The created game.
 */
export const createTextGame = async (
  fontJsonUrl: string,
  fontPngUrl: string,
): Promise<Game> => {
  const { game, world, renderContext, time } = createGame('demo-game');

  createCamera(world, {
    isStatic: true,
    cullingMask: renderLayers.foreground,
    verticalWorldUnits: DEMO_VERTICAL_WORLD_UNITS,
  });

  const font = await loadFontAtlas(
    fontJsonUrl,
    fontPngUrl,
    renderContext.imageCache,
  );
  const renderable = createMsdfTextRenderable(
    font,
    renderContext,
    renderLayers.foreground,
  );

  createLabels(world, font, renderable);

  world.addSystem(createCameraEcsSystem(time));
  // Both registered `early`, before `createRenderEcsSystem`'s default
  // (`normal`) order: the counter must update `text` before shaping reads
  // it, and shaping must run before render consumes this frame's glyphs.
  world.addSystem(
    createElapsedCounterEcsSystem(time),
    SystemRegistrationOrder.early,
  );
  world.addSystem(createTextShapingEcsSystem(), SystemRegistrationOrder.early);
  world.addSystem(createRenderEcsSystem(renderContext));

  return game;
};
