import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SoundAssetCache } from './sound-asset-cache.js';
import { createSoundMixer, SoundMixer } from './sound-mixer.js';
import { FakeAudioContext } from './test-helpers/fake-audio-context.js';

describe('SoundAssetCache', () => {
  let context: FakeAudioContext;
  let mixer: SoundMixer;
  let cache: SoundAssetCache;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    context = new FakeAudioContext();
    mixer = createSoundMixer(context.asAudioContext());
    cache = new SoundAssetCache(mixer);
    fetchMock = vi.fn(() =>
      Promise.resolve(new Response(new ArrayBuffer(8), { status: 200 })),
    );
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    await mixer.stop();
  });

  it('fetches, decodes and caches a sound', async () => {
    const buffer = { duration: 2.5 };

    context.decodeAudioData = vi.fn(() => Promise.resolve(buffer));

    const sound = await cache.getOrLoad('laser.mp3');

    expect(fetchMock).toHaveBeenCalledWith('laser.mp3');
    expect(sound).toEqual({ buffer, durationSeconds: 2.5 });
    expect(cache.get('laser.mp3')).toBe(sound);
  });

  it('decodes a sound once for concurrent requests', async () => {
    const decode = vi.fn(() => Promise.resolve({ duration: 1 }));

    context.decodeAudioData = decode;

    const [first, second] = await Promise.all([
      cache.getOrLoad('music.mp3'),
      cache.getOrLoad('music.mp3'),
    ]);

    expect(first).toBe(second);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(decode).toHaveBeenCalledTimes(1);
  });

  it("doesn't fetch a cached sound again", async () => {
    await cache.load('laser.mp3');
    await cache.getOrLoad('laser.mp3');

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("throws when getting a sound that isn't loaded", () => {
    expect(() => cache.get('laser.mp3')).toThrow(
      /"laser.mp3" not found in the cache/,
    );
  });

  it("throws for a mixer that wasn't made by createSoundMixer", () => {
    const mixerCopy: SoundMixer = { ...mixer };

    expect(() => new SoundAssetCache(mixerCopy)).toThrow(
      /not made by `createSoundMixer`/,
    );
  });

  it('rejects with the URL when the file fails to load', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 404 }));

    await expect(cache.getOrLoad('missing.mp3')).rejects.toThrow(
      /Failed to load the sound at "missing.mp3"/,
    );
  });

  it("rejects with the URL when the file can't be decoded", async () => {
    context.decodeAudioData = () =>
      Promise.reject(new DOMException('Unable to decode', 'EncodingError'));

    await expect(cache.getOrLoad('sound.ogg')).rejects.toThrow(
      /Unable to decode the sound at "sound.ogg"/,
    );
  });

  it('loads again after a failed load', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Network error'));

    await expect(cache.getOrLoad('laser.mp3')).rejects.toThrow();
    await expect(cache.getOrLoad('laser.mp3')).resolves.toBeDefined();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
