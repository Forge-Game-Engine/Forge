import { type AssetCache, ImageCache } from '../../asset-loading/index.js';
import type { FontAtlas } from './font-atlas.js';
import { toFontAtlasData } from './font-atlas-file-data.js';
import { validateFontAtlasFileData } from './validate-font-atlas-data.js';

/**
 * Loads and caches `FontAtlas`es: a metrics JSON file plus its atlas image,
 * keyed by a shared base path (e.g. `getOrLoad('assets/fonts/my-font')`
 * loads `assets/fonts/my-font.json`, which in turn points at its own atlas
 * image, resolved relative to that JSON file).
 */
export class FontAtlasCache implements AssetCache<FontAtlas> {
  public assets = new Map<string, FontAtlas>();

  private readonly _imageCache: ImageCache;

  constructor(imageCache: ImageCache = new ImageCache()) {
    this._imageCache = imageCache;
  }

  /**
   * Retrieves a font atlas from the cache.
   * @param key - The key of the font atlas to retrieve.
   * @returns The cached font atlas.
   * @throws Will throw an error if the font atlas is not found in the cache.
   */
  public get(key: string): FontAtlas {
    const fontAtlas = this.assets.get(key);

    if (!fontAtlas) {
      throw new Error(`Font atlas with key "${key}" not found in store.`);
    }

    return fontAtlas;
  }

  /**
   * Loads a font atlas's JSON metrics and image from the specified key and
   * caches it.
   * @param key - The key of the font atlas to load, without a file extension.
   * @returns A promise that resolves when the font atlas is loaded and cached.
   * @throws Will throw an error if the JSON fails to fetch, is malformed, or
   * is an unsupported/incompatible atlas format.
   */
  public async load(key: string): Promise<void> {
    const jsonPath = `${key}.json`;
    const response = await fetch(jsonPath);

    if (!response.ok) {
      throw new Error(
        `Failed to load font atlas JSON at "${jsonPath}": ${response.status} ${response.statusText}`,
      );
    }

    const rawJson: unknown = await response.json();
    const fileData = validateFontAtlasFileData(rawJson, jsonPath);
    const data = toFontAtlasData(fileData);
    const imagePath = resolveRelativeToKey(key, data.atlasImage);
    const image = await this._imageCache.getOrLoad(imagePath);

    this.assets.set(key, { data, image });
  }

  /**
   * Retrieves a font atlas from the cache if it exists, otherwise loads and
   * caches it.
   * @param key - The key of the font atlas to retrieve or load.
   * @returns A promise that resolves to the font atlas.
   */
  public async getOrLoad(key: string): Promise<FontAtlas> {
    if (!this.assets.has(key)) {
      await this.load(key);
    }

    return this.get(key);
  }
}

/**
 * Resolves `relativePath` against the directory `key` sits in, the same way
 * `FontAtlasData.atlasImage` is documented as being relative to its own
 * JSON file.
 */
function resolveRelativeToKey(key: string, relativePath: string): string {
  const lastSlashIndex = key.lastIndexOf('/');
  const directory =
    lastSlashIndex === -1 ? '' : key.slice(0, lastSlashIndex + 1);

  return `${directory}${relativePath}`;
}
