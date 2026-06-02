/**
 * Interface for an asset cache that manages loading and retrieving assets.
 *
 * @template TItem - The type of asset being cached.
 * @template TLoadArgs - The type of arguments for loading assets.
 */
export interface AssetCache<TItem> {
  /**
   * A map of asset keys to their corresponding assets.
   */
  assets: Map<string, TItem>;

  /**
   * Retrieves an asset from the cache.
   * @param key - The key of the asset to retrieve.
   * @returns The cached asset.
   */
  get: (key: string) => TItem;

  /**
   * Loads an asset from the specified key and caches it.
   * @param key - The key of the asset to load.
   * @returns A promise that resolves when the asset is loaded and cached.
   */
  load: (key: string) => Promise<void>;

  /**
   * Retrieves an asset from the cache if it exists, otherwise loads and caches it.
   * @param key - The key of the asset to retrieve or load.
   * @returns A promise that resolves to the asset.
   */
  getOrLoad: (key: string) => Promise<TItem>;
}
