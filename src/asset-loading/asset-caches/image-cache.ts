import type { AssetCache } from 'forge/asset-loading/asset-cache';

/**
 * Class to manage the caching and loading of images.
 */
export class ImageCache implements AssetCache<HTMLImageElement> {
  public assets = new Map<string, HTMLImageElement>();

  /**
   * Retrieves an image from the cache.
   * @param path - The path of the image to retrieve.
   * @returns The cached image element.
   * @throws Will throw an error if the image is not found in the cache.
   */
  public get(path: string): HTMLImageElement {
    const image = this.assets.get(path);

    if (!image) {
      throw new Error(`Image with path "${path}" not found in store.`);
    }

    return image;
  }

  /**
   * Loads an image from the specified path and caches it.
   * @param path - The path of the image to load.
   * @returns A promise that resolves when the image is loaded and cached.
   * @throws Will throw an error if the image fails to load.
   */
  public load(path: string): Promise<void> {
    const image = new Image();
    image.src = path;

    return new Promise<void>((resolve, reject) => {
      image.onload = () => {
        this.assets.set(path, image);
        image.onload = null;
        image.onerror = null;
        resolve();
      };

      image.onerror = (error) => {
        image.onload = null;
        image.onerror = null;
        console.error(error);
        reject(new Error(`Failed to load image at ${path}`));
      };
    });
  }

  /**
   * Retrieves an image from the cache if it exists, otherwise loads and caches it.
   * @param path - The path of the image to retrieve or load.
   * @returns A promise that resolves to the image element.
   */
  public async getOrLoad(path: string): Promise<HTMLImageElement> {
    if (!this.assets.has(path)) {
      await this.load(path);
    }

    return this.get(path);
  }
}
