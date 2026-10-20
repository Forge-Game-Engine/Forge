import { getAssetUrl } from '@site/src/utils/get-asset-url';
import {
  RenderContext,
  TextureAtlas,
  TextureAtlasCache,
} from '@forge-game-engine/forge/rendering';

/**
 * Loads the demo's TexturePacker atlas: one PNG holding every image in the
 * scene, and a "JSON (Hash)" file naming each image's region, its trim and
 * its pivot.
 * @param renderContext - The render context to create the atlas texture in.
 * @returns The atlas.
 */
export async function loadAtlas(
  renderContext: RenderContext,
): Promise<TextureAtlas> {
  const atlasCache = new TextureAtlasCache(renderContext);

  return atlasCache.getOrLoad({
    // Importing the JSON would give its parsed contents, so `new URL` asks
    // webpack for its URL instead.
    dataUrl: new URL(
      '@site/static/img/sprite-atlas/sprite-atlas.json',
      import.meta.url,
    ).href,
    imageUrl: getAssetUrl('img/sprite-atlas/sprite-atlas.png'),
  });
}
