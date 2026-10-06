import type { AssetCache } from '../asset-loading/index.js';
import type { SoundAsset } from './sound-asset.js';
import type { SoundMixer } from './sound-mixer.js';
import { toAudioBus } from './audio-bus.js';

/**
 * Loads sound files and keeps each decoded {@link SoundAsset}, keyed by
 * URL, so a sound is fetched and decoded once however many times it plays.
 * Requests for a URL that's still loading share that load.
 *
 * Files are decoded by the browser (`AudioContext.decodeAudioData`), so the
 * formats a game can use are the ones every browser it targets decodes.
 */
export class SoundAssetCache implements AssetCache<SoundAsset> {
  public assets = new Map<string, SoundAsset>();
  private readonly _context: AudioContext;
  private readonly _loading = new Map<string, Promise<void>>();

  /**
   * Creates an empty cache.
   * @param mixer - The mixer whose `AudioContext` decodes the sounds.
   */
  constructor(mixer: SoundMixer) {
    this._context = toAudioBus(mixer.master).mixer.context;
  }

  /**
   * Retrieves a loaded sound.
   * @param url - The URL the sound was loaded from.
   * @returns The sound asset.
   * @throws An error if no sound has been loaded from `url`.
   */
  public get(url: string): SoundAsset {
    const sound = this.assets.get(url);

    if (!sound) {
      throw new Error(`Sound with URL "${url}" not found in the cache.`);
    }

    return sound;
  }

  /**
   * Fetches and decodes the sound at `url` and caches it. Concurrent calls
   * for the same URL share one fetch and decode.
   * @param url - The URL of the sound file.
   * @returns A promise that resolves once the sound is cached.
   * @throws An error, through the promise, if the file can't be fetched or
   * the browser can't decode it.
   */
  public load(url: string): Promise<void> {
    const loading = this._loading.get(url);

    if (loading) {
      return loading;
    }

    const load = this._fetchAndDecode(url).finally(() => {
      this._loading.delete(url);
    });

    this._loading.set(url, load);

    return load;
  }

  /**
   * Retrieves a sound if it's cached, otherwise loads and caches it.
   * @param url - The URL of the sound file.
   * @returns A promise that resolves to the sound asset.
   * @throws An error, through the promise, if the file can't be fetched or
   * the browser can't decode it.
   */
  public async getOrLoad(url: string): Promise<SoundAsset> {
    if (!this.assets.has(url)) {
      await this.load(url);
    }

    return this.get(url);
  }

  private async _fetchAndDecode(url: string): Promise<void> {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(
        `Failed to load sound at ${url}: ${response.status} ${response.statusText}`,
      );
    }

    const bytes = await response.arrayBuffer();
    let buffer: AudioBuffer;

    try {
      buffer = await this._context.decodeAudioData(bytes);
    } catch (error) {
      throw new Error(
        `Failed to decode sound at ${url}, the browser doesn't support its format or the file is damaged.`,
        { cause: error },
      );
    }

    this.assets.set(url, { buffer, durationSeconds: buffer.duration });
  }
}
