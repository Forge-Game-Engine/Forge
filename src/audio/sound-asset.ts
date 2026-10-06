/**
 * Decoded audio, ready to play any number of times, on any number of buses
 * at once. Load one with a {@link SoundAssetCache}, or build one from
 * samples with {@link createSoundAsset}.
 */
export interface SoundAsset {
  /** The decoded samples. */
  readonly buffer: AudioBuffer;

  /** The sound's length, in seconds, at a playback rate of `1`. */
  readonly durationSeconds: number;
}

/**
 * Samples to build a {@link SoundAsset} from.
 */
export interface SoundSamples {
  /** Samples per second, e.g. `44100`. */
  sampleRate: number;

  /**
   * One array of samples per channel (one for mono, two for stereo), each
   * value in `[-1, 1]`. Every channel must have the same length.
   */
  channels: readonly Float32Array[];
}

/**
 * Creates a sound from samples, for audio synthesized or generated at
 * runtime. No file, decoding or `AudioContext` is involved.
 * @param samples - The sample rate and the samples of each channel.
 * @returns The sound asset.
 * @throws An error if there are no channels, a channel is empty, or the
 * channels differ in length.
 */
export function createSoundAsset(samples: SoundSamples): SoundAsset {
  const { sampleRate, channels } = samples;

  if (channels.length === 0) {
    throw new Error('Unable to create a sound asset with no channels.');
  }

  const length = channels[0].length;

  if (length === 0) {
    throw new Error('Unable to create a sound asset with no samples.');
  }

  if (channels.some((channel) => channel.length !== length)) {
    throw new Error(
      'Unable to create a sound asset, its channels have different lengths.',
    );
  }

  const buffer = new AudioBuffer({
    length,
    numberOfChannels: channels.length,
    sampleRate,
  });

  channels.forEach((channel, index) => {
    // Copied through a fresh array: `copyToChannel` requires an
    // ArrayBuffer-backed array, and a caller's samples may be backed by a
    // SharedArrayBuffer.
    buffer.copyToChannel(new Float32Array(channel), index);
  });

  return { buffer, durationSeconds: buffer.duration };
}
