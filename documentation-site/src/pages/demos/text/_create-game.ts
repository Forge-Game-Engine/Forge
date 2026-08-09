import {
  createCamera,
  createCameraEcsSystem,
  createRenderEcsSystem,
} from '@forge-game-engine/forge/rendering';
import {
  createTextShapingEcsSystem,
  FontAtlasCache,
} from '@forge-game-engine/forge/text';
import { createGame, Game } from '@forge-game-engine/forge/utilities';
import { DEMO_VERTICAL_WORLD_UNITS } from '@site/src/utils/demo-camera';
import { createCounterEcsSystem } from './_counter.system';
import { createLabels } from './_create-labels';

const renderLayers = {
  foreground: 1 << 0,
};

/**
 * Builds the text rendering demo: a heading, a subheading, and a counter
 * label that updates once per second, all drawn from one shared `FontAtlas`
 * loaded from `fontAtlasUrl`.
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

  createLabels(world, fontAtlas, renderLayers.foreground);

  world.addSystem(createCameraEcsSystem(time));
  world.addSystem(createCounterEcsSystem(time));
  world.addSystem(createTextShapingEcsSystem(renderContext));
  world.addSystem(createRenderEcsSystem(renderContext));

  return game;
};
