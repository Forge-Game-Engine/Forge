import { withDefaults } from '../../utilities/with-defaults.js';
import type { RenderContext } from '../render-context.js';
import type { TextureFilter } from '../texture.js';
import { createTexturePackerAtlas } from './create-texture-packer-atlas.js';
import { parseTexturePackerAtlas } from './parse-texture-packer-atlas.js';
import type { TextureAtlas } from './texture-atlas.js';

/**
 * The two files a texture atlas is loaded from. Pass the URLs your bundler
 * gives you for each file (e.g. Vite's `import url from './hero.json?url'`
 * and `import url from './hero.png'`), so content-hashed file names work.
 * The image is never looked up from the JSON's `meta.image`.
 */
export interface TextureAtlasUrls {
  /** The URL of the TexturePacker JSON file. The atlas is cached under it. */
  dataUrl: string;

  /** The URL of the atlas image, exported together with the JSON. */
  imageUrl: string;
}

/**
 * Options for {@link TextureAtlasCache.getOrLoad}.
 */
export interface TextureAtlasLoadOptions {
  /**
   * How the atlas texture is filtered. Defaults to `'linear'`; use
   * `'nearest'` for pixel art.
   */
  filter?: TextureFilter;
}

const defaultTextureAtlasLoadOptions: Required<TextureAtlasLoadOptions> = {
  filter: 'linear',
};

interface TextureAtlasLoad {
  readonly imageUrl: string;
  readonly filter: TextureFilter;
  readonly promise: Promise<TextureAtlas>;
}

/**
 * Loads and caches `TextureAtlas`es from a TexturePacker "JSON (Hash)" or
 * "JSON (Array)" file and its image, keyed by the JSON file's URL (see
 * `parseTexturePackerAtlas` for the format). Each atlas's texture comes
 * from the render context's `textureCache`, which owns it, so an atlas and
 * a plain sprite of the same image share one texture. The cache holds only
 * CPU-side data, so it has nothing to dispose or rebuild after a context
 * loss.
 */
export class TextureAtlasCache {
  private readonly _renderContext: RenderContext;
  private readonly _loads = new Map<string, TextureAtlasLoad>();
  private readonly _atlases = new Map<string, TextureAtlas>();

  /**
   * Constructs a new instance of the `TextureAtlasCache` class.
   * @param renderContext - The render context the atlas textures are
   * created in. Atlas textures load through its `textureCache`.
   */
  constructor(renderContext: RenderContext) {
    this._renderContext = renderContext;
  }

  /**
   * Retrieves a loaded texture atlas from the cache.
   * @param dataUrl - The URL of the atlas's JSON file.
   * @returns The cached atlas.
   * @throws An error if the atlas hasn't finished loading.
   */
  public get(dataUrl: string): TextureAtlas {
    const atlas = this._atlases.get(dataUrl);

    if (!atlas) {
      throw new Error(
        `Texture atlas with data URL "${dataUrl}" not found in the cache.`,
      );
    }

    return atlas;
  }

  /**
   * Retrieves a texture atlas from the cache, loading its JSON and image
   * the first time it's requested. Concurrent calls for the same atlas
   * share one load, and a failed load is tried again by the next call.
   * @param urls - The URLs of the atlas's JSON file and image.
   * @param options - How the atlas texture is sampled.
   * @returns A promise that resolves to the atlas.
   * @throws The promise rejects if `urls.dataUrl` was already requested
   * with a different image URL or filter, if the JSON fails to fetch or
   * isn't a valid TexturePacker file, if the image fails to load, or if the
   * image's size doesn't match the JSON's `meta.size`.
   */
  public async getOrLoad(
    urls: TextureAtlasUrls,
    options: TextureAtlasLoadOptions = {},
  ): Promise<TextureAtlas> {
    const { dataUrl, imageUrl } = urls;
    const { filter } = withDefaults(defaultTextureAtlasLoadOptions, options);
    const existingLoad = this._loads.get(dataUrl);

    if (existingLoad) {
      if (
        existingLoad.imageUrl !== imageUrl ||
        existingLoad.filter !== filter
      ) {
        throw new Error(
          `Texture atlas "${dataUrl}" was already requested with image "${existingLoad.imageUrl}" and filter "${existingLoad.filter}", so it can't also be loaded with image "${imageUrl}" and filter "${filter}".`,
        );
      }

      return existingLoad.promise;
    }

    const promise = this._load(dataUrl, imageUrl, filter);

    this._loads.set(dataUrl, { imageUrl, filter, promise });

    try {
      return await promise;
    } catch (error) {
      if (this._loads.get(dataUrl)?.promise === promise) {
        this._loads.delete(dataUrl);
      }

      throw error;
    }
  }

  private async _load(
    dataUrl: string,
    imageUrl: string,
    filter: TextureFilter,
  ): Promise<TextureAtlas> {
    try {
      const [json, texture] = await Promise.all([
        fetchJson(dataUrl),
        this._renderContext.textureCache.getOrLoad(imageUrl, { filter }),
      ]);
      const atlas = createTexturePackerAtlas(
        texture,
        parseTexturePackerAtlas(json),
      );

      this._atlases.set(dataUrl, atlas);

      return atlas;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      throw new Error(`Unable to load texture atlas "${dataUrl}": ${message}`, {
        cause: error,
      });
    }
  }
}

/**
 * Fetches the JSON at `url`.
 */
async function fetchJson(url: string): Promise<unknown> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `failed to fetch its JSON: ${response.status} ${response.statusText}`,
    );
  }

  const json: unknown = await response.json();

  return json;
}
