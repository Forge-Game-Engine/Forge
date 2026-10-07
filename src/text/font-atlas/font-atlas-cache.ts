import type { RenderContext } from '../../rendering/render-context.js';
import type { FontAtlas } from './font-atlas.js';
import type { FontAtlasData } from './font-atlas-data.js';
import { toFontAtlasData } from './font-atlas-file-data.js';
import { validateFontAtlasFileData } from './validate-font-atlas-data.js';

/**
 * The two files a font atlas is loaded from. Pass the URLs your bundler
 * gives you for each file (e.g. Vite's `import url from './font.json?url'`
 * and `import url from './font.png'`), so content-hashed file names work.
 */
export interface FontAtlasUrls {
  /** The URL of the atlas's metrics JSON file. */
  metricsUrl: string;

  /** The URL of the atlas's image, generated together with the metrics. */
  imageUrl: string;
}

interface FontAtlasLoad {
  readonly imageUrl: string;
  readonly promise: Promise<FontAtlas>;
}

/**
 * Loads and caches `FontAtlas`es from a metrics JSON file and its atlas
 * image, keyed by the metrics file's URL. Each atlas's texture comes from
 * the render context's `textureCache`, which owns it.
 */
export class FontAtlasCache {
  private readonly _renderContext: RenderContext;
  private readonly _loads = new Map<string, FontAtlasLoad>();
  private readonly _fontAtlases = new Map<string, FontAtlas>();

  /**
   * Constructs a new instance of the `FontAtlasCache` class.
   * @param renderContext - The render context the atlas textures are
   * created in. Atlas textures load through its `textureCache`.
   */
  constructor(renderContext: RenderContext) {
    this._renderContext = renderContext;
  }

  /**
   * Retrieves a loaded font atlas from the cache.
   * @param metricsUrl - The URL of the font atlas's metrics JSON file.
   * @returns The cached font atlas.
   * @throws Will throw an error if the font atlas hasn't finished loading.
   */
  public get(metricsUrl: string): FontAtlas {
    const fontAtlas = this._fontAtlases.get(metricsUrl);

    if (!fontAtlas) {
      throw new Error(
        `Font atlas with metrics URL "${metricsUrl}" not found in store.`,
      );
    }

    return fontAtlas;
  }

  /**
   * Retrieves a font atlas from the cache, loading it the first time it's
   * requested. Concurrent calls for the same atlas share one load.
   * @param urls - The URLs of the atlas's metrics JSON file and image.
   * @returns A promise that resolves to the font atlas.
   * @throws Will throw an error if `urls.metricsUrl` was already requested
   * with a different image URL, if the JSON fails to fetch, is malformed or
   * is an unsupported atlas format, if the image fails to load, or if the
   * image's size doesn't match the metrics' `atlasSize`.
   */
  public async getOrLoad(urls: FontAtlasUrls): Promise<FontAtlas> {
    const { metricsUrl, imageUrl } = urls;
    const existingLoad = this._loads.get(metricsUrl);

    if (existingLoad) {
      if (existingLoad.imageUrl !== imageUrl) {
        throw new Error(
          `Font atlas "${metricsUrl}" was already requested with image "${existingLoad.imageUrl}", so it can't also be loaded with image "${imageUrl}".`,
        );
      }

      return existingLoad.promise;
    }

    const promise = this._load(metricsUrl, imageUrl);

    this._loads.set(metricsUrl, { imageUrl, promise });

    try {
      return await promise;
    } catch (error) {
      if (this._loads.get(metricsUrl)?.promise === promise) {
        this._loads.delete(metricsUrl);
      }

      throw error;
    }
  }

  private async _load(
    metricsUrl: string,
    imageUrl: string,
  ): Promise<FontAtlas> {
    // Linear filtering (the default): the MSDF shaders reconstruct the
    // glyph's edge from distances interpolated between texels.
    const [data, texture] = await Promise.all([
      loadFontAtlasData(metricsUrl),
      this._renderContext.textureCache.getOrLoad(imageUrl),
    ]);

    const { width, height } = data.atlasSize;

    if (texture.width !== width || texture.height !== height) {
      throw new Error(
        `Font atlas image "${imageUrl}" is ${texture.width}x${texture.height}, but the metrics at "${metricsUrl}" expect ${width}x${height}. Check that both files come from the same generated atlas.`,
      );
    }

    const fontAtlas: FontAtlas = { data, texture };

    this._fontAtlases.set(metricsUrl, fontAtlas);

    return fontAtlas;
  }
}

/**
 * Fetches, validates and converts the metrics JSON at `metricsUrl`.
 */
async function loadFontAtlasData(metricsUrl: string): Promise<FontAtlasData> {
  const response = await fetch(metricsUrl);

  if (!response.ok) {
    throw new Error(
      `Failed to load font atlas JSON at "${metricsUrl}": ${response.status} ${response.statusText}`,
    );
  }

  const rawJson: unknown = await response.json();

  return toFontAtlasData(validateFontAtlasFileData(rawJson, metricsUrl));
}
