import { withDefaults } from '../utilities/with-defaults.js';
import { defaultTextureOptions } from './default-texture-options.js';
import { OwnedTexture } from './owned-texture.js';
import type { RenderContext } from './render-context.js';
import type { Texture, TextureOptions } from './texture.js';

/**
 * Loads each image file into a texture once, and hands the same texture to
 * every request for it, so sprites drawn from one file share a texture and
 * draw in one batch. Each render context has one, as
 * `renderContext.textureCache`.
 *
 * Textures are keyed by URL and sampling options: the same file loaded with
 * another `filter` or `wrap` is a second texture. Requests for a texture
 * that's still loading share that load. Images load through the render
 * context's `imageCache`.
 *
 * The cache owns its textures, since any number of sprites may be drawing
 * them: their `update` and `dispose` throw. A texture to change or free
 * yourself is created with `createTexture` instead.
 */
export class TextureCache {
  private readonly _renderContext: RenderContext;
  private readonly _textures = new Map<string, Texture>();
  private readonly _loads = new Map<string, Promise<Texture>>();

  /**
   * Creates a texture cache. A render context creates its own; use
   * `renderContext.textureCache` rather than creating another.
   * @param renderContext - The render context the textures are created in.
   */
  constructor(renderContext: RenderContext) {
    this._renderContext = renderContext;
  }

  /**
   * Gets a loaded texture.
   * @param url - The URL the texture's image was loaded from.
   * @param options - The sampling options it was loaded with.
   * @returns The texture.
   * @throws An error if the texture at `url` with these options hasn't
   * finished loading.
   */
  public get(url: string, options: Partial<TextureOptions> = {}): Texture {
    const texture = this._textures.get(textureKey(url, options));

    if (!texture) {
      throw new Error(`Texture with URL "${url}" not found in the cache.`);
    }

    return texture;
  }

  /**
   * Gets the texture of the image at `url`, loading the image and creating
   * the texture the first time it's requested with these options.
   * @param url - The URL of the image.
   * @param options - How the texture is sampled: `filter` defaults to
   * `'linear'` (use `'nearest'` for pixel art) and `wrap` to `'clamp'`.
   * @returns A promise that resolves to the texture.
   * @throws The promise rejects if the image fails to load. A later request
   * tries again.
   */
  public getOrLoad(
    url: string,
    options: Partial<TextureOptions> = {},
  ): Promise<Texture> {
    const key = textureKey(url, options);
    const texture = this._textures.get(key);

    if (texture) {
      return Promise.resolve(texture);
    }

    const loading = this._loads.get(key);

    if (loading) {
      return loading;
    }

    const load = this._load(key, url, options).finally(() => {
      this._loads.delete(key);
    });

    this._loads.set(key, load);

    return load;
  }

  private async _load(
    key: string,
    url: string,
    options: Partial<TextureOptions>,
  ): Promise<Texture> {
    const image = await this._renderContext.imageCache.getOrLoad(url);
    const texture = OwnedTexture.createFromSource(
      this._renderContext,
      "the render context's texture cache",
      image,
      options,
    );

    this._textures.set(key, texture);

    return texture;
  }
}

/**
 * The key a texture is cached under: its URL and its resolved sampling
 * options, so options left out and options given as their defaults share
 * a texture.
 */
function textureKey(url: string, options: Partial<TextureOptions>): string {
  const { filter, wrap } = withDefaults(defaultTextureOptions, options);

  return `${filter} ${wrap} ${url}`;
}
