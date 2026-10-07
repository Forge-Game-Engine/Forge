import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSoundAsset } from './sound-asset.js';
import { FakeAudioBuffer } from './test-helpers/fake-audio-context.js';

describe('createSoundAsset', () => {
  beforeEach(() => {
    vi.stubGlobal('AudioBuffer', FakeAudioBuffer);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('copies each channel into a buffer', () => {
    const left = new Float32Array([0, 0.5, -0.5, 1]);
    const right = new Float32Array([1, -1, 0.25, 0]);

    const sound = createSoundAsset({ sampleRate: 4, channels: [left, right] });
    const buffer = sound.buffer as unknown as FakeAudioBuffer;

    expect(buffer.sampleRate).toBe(4);
    expect(buffer.numberOfChannels).toBe(2);
    expect(buffer.channels).toEqual([left, right]);
    expect(sound.durationSeconds).toBe(1);
  });

  it('throws without channels', () => {
    expect(() => createSoundAsset({ sampleRate: 44100, channels: [] })).toThrow(
      /without any channels/,
    );
  });

  it('throws for empty channels', () => {
    expect(() =>
      createSoundAsset({ sampleRate: 44100, channels: [new Float32Array(0)] }),
    ).toThrow(/empty channels/);
  });

  it('throws when the channels differ in length', () => {
    expect(() =>
      createSoundAsset({
        sampleRate: 44100,
        channels: [new Float32Array(3), new Float32Array(4)],
      }),
    ).toThrow(/same number of samples/);
  });
});
