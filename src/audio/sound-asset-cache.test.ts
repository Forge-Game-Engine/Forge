import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  FakeAudioBuffer,
  FakeAudioContext,
} from './internal/fake-audio-context.test-helper.js';
import { createSoundMixer } from './sound-mixer.js';
import { SoundAssetCache } from './sound-asset-cache.js';

describe('SoundAssetCache', () => {
  let context: FakeAudioContext;
  let cache: SoundAssetCache;
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    context = new FakeAudioContext();
    cache = new SoundAssetCache(createSoundMixer(context.asAudioContext()));
    fetchMock.mockImplementation(() =>
      Promise.resolve(new Response(new ArrayBuffer(8))),
    );
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('fetches, decodes and caches a sound', async () => {
    context.decodeResult = () => Promise.resolve(new FakeAudioBuffer(2.5));

    const sound = await cache.getOrLoad('laser.ogg');

    expect(fetchMock).toHaveBeenCalledWith('laser.ogg');
    expect(sound.durationSeconds).toBe(2.5);
    expect(cache.get('laser.ogg')).toBe(sound);
    expect(await cache.getOrLoad('laser.ogg')).toBe(sound);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('shares one decode between concurrent loads', async () => {
    const [first, second] = await Promise.all([
      cache.getOrLoad('music.ogg'),
      cache.getOrLoad('music.ogg'),
    ]);

    expect(first).toBe(second);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(context.decodedBytes).toHaveLength(1);
  });

  it('throws for a sound that is not cached', () => {
    expect(() => cache.get('missing.ogg')).toThrow(/missing\.ogg/);
  });

  it('rejects naming the URL when the fetch fails', async () => {
    fetchMock.mockImplementation(() =>
      Promise.resolve(new Response(null, { status: 404 })),
    );

    await expect(cache.load('missing.ogg')).rejects.toThrow(/missing\.ogg/);
  });

  it('rejects naming the URL when the sound cannot be decoded', async () => {
    context.decodeResult = () => Promise.reject(new Error('EncodingError'));

    await expect(cache.load('sound.xyz')).rejects.toThrow(/sound\.xyz/);
  });

  it('loads again after a failed load', async () => {
    context.decodeResult = () => Promise.reject(new Error('EncodingError'));
    await expect(cache.load('sound.ogg')).rejects.toThrow();

    context.decodeResult = () => Promise.resolve(new FakeAudioBuffer(1));
    await expect(cache.getOrLoad('sound.ogg')).resolves.toBeDefined();
  });
});
