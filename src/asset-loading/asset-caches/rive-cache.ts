import { type AssetLoadCallback, RiveFile } from '@rive-app/webgl2';
import type { AssetCache } from 'forge/asset-loading/asset-cache';

/**
 * Class to manage the caching and loading of rive files.
 */
export class RiveCache implements AssetCache<RiveFile> {
  public assets = new Map<string, RiveFile>();

  /**
   * Retrieves a rive file from the cache.
   * @param path - The path of the rive file to retrieve.
   * @returns The cached rive file.
   * @throws Will throw an error if the rive file is not found in the cache.
   */
  public get(path: string): RiveFile {
    const riveFile = this.assets.get(path);

    if (!riveFile) {
      throw new Error(`Rive file with path "${path}" not found in store.`);
    }

    return riveFile;
  }

  /**
   * Loads a rive file from the specified path and caches it.
   * @param path - The path of the rive file to load.
   * @returns A promise that resolves when the rive file is loaded and cached.
   * @throws Will throw an error if the rive file fails to load.
   */
  public async load(
    path: string,
    assetLoader?: AssetLoadCallback,
  ): Promise<void> {
    const file = new RiveFile({
      src: path,
      onLoad: () => {
        this.assets.set(path, file);
      },
      onLoadError: (error) => {
        throw new Error(
          `Failed to load Rive file from path "${path}": ${JSON.stringify(error.data)} - type: ${error.type}`,
        );
      },
      assetLoader,
    });

    return await file.init();
  }

  /**
   * Retrieves a rive file from the cache if it exists, otherwise loads and caches it.
   * @param path - The path of the rive file to retrieve or load.
   * @returns A promise that resolves to the rive file.
   */
  public async getOrLoad(
    path: string,
    assetLoader?: AssetLoadCallback,
  ): Promise<RiveFile> {
    if (!this.assets.has(path)) {
      await this.load(path, assetLoader);
    }

    return this.get(path);
  }
}
