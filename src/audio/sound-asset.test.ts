import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSoundAsset } from './sound-asset.js';

class FakeAudioBuffer {
  public readonly duration: number;
  public readonly copied: Float32Array[] = [];

  constructor(public readonly options: AudioBufferOptions) {
    this.duration = options.length / options.sampleRate;
  }

  public copyToChannel(source: Float32Array, channel: number): void {
    this.copied[channel] = source;
  }
}

describe('createSoundAsset', () => {
  beforeEach(() => {
    vi.stubGlobal('AudioBuffer', FakeAudioBuffer);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('builds a buffer from each channel', () => {
    const left = new Float32Array([0, 0.5, -0.5, 1]);
    const right = new Float32Array([1, -1, 0, 0]);

    const sound = createSoundAsset({ sampleRate: 4, channels: [left, right] });
    const buffer = sound.buffer as unknown as FakeAudioBuffer;

    expect(buffer.options).toEqual({
      length: 4,
      numberOfChannels: 2,
      sampleRate: 4,
    });
    expect(buffer.copied).toEqual([left, right]);
    expect(sound.durationSeconds).toBe(1);
  });

  it('throws for no channels, no samples or uneven channels', () => {
    expect(() => createSoundAsset({ sampleRate: 4, channels: [] })).toThrow();
    expect(() =>
      createSoundAsset({ sampleRate: 4, channels: [new Float32Array(0)] }),
    ).toThrow();
    expect(() =>
      createSoundAsset({
        sampleRate: 4,
        channels: [new Float32Array(2), new Float32Array(3)],
      }),
    ).toThrow();
  });
});
