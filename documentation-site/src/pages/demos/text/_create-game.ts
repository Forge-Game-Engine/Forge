import { createTransformEcsSystem } from '@forge-game-engine/forge/common';
import defaultFontImageUrl from '@forge-game-engine/forge/fonts/default/default.png';
import {
  createCamera,
  createImageSprite,
  createRenderEcsSystem,
} from '@forge-game-engine/forge/rendering';
import {
  createTextShapingEcsSystem,
  FontAtlasCache,
} from '@forge-game-engine/forge/text';
import { createGame, Game } from '@forge-game-engine/forge/utilities';
import { DEMO_VERTICAL_WORLD_UNITS } from '@site/src/utils/demo-camera';
import { createPlayground, Playground } from './_create-playground';

/**
 * Builds the text demo: one block of text drawn with the engine's default
 * font, which the page's controls change while the game runs.
 * @param onPlaygroundReady - Called with the playground once it exists, so
 * the page's controls can update it.
 * @returns The created game.
 */
export const createTextGame = async (
  onPlaygroundReady: (playground: Playground) => void,
): Promise<Game> => {
  const { game, world, renderContext } = createGame('demo-game');

  createCamera(world, {
    isStatic: true,
    verticalWorldUnits: DEMO_VERTICAL_WORLD_UNITS,
  });

  // The engine ships a default font. Importing its JSON would give the
  // parsed contents, so `new URL` asks webpack for the file's URL instead.
  const fontAtlas = await new FontAtlasCache(renderContext).getOrLoad({
    metricsUrl: new URL(
      '@forge-game-engine/forge/fonts/default/default.json',
      import.meta.url,
    ).href,
    imageUrl: defaultFontImageUrl,
  });

  const whiteSprite = createImageSprite(renderContext.whiteTexture, {
    pixelsPerUnit: 1,
  });

  const playground = createPlayground(world, fontAtlas, whiteSprite);

  onPlaygroundReady(playground);

  world.addSystem(createTransformEcsSystem());
  world.addSystem(createTextShapingEcsSystem());
  world.addSystem(createRenderEcsSystem(renderContext));

  return game;
};
