/**
 * Decoded audio, ready to play any number of times, on any bus, at once.
 * Load sounds from files with a `SoundAssetCache`, or make one from samples
 * with {@link createSoundAsset}.
 */
export interface SoundAsset {
  /** The decoded samples. */
  readonly buffer: AudioBuffer;

  /** How long the sound lasts at a playback rate of 1, in seconds. */
  readonly durationSeconds: number;
}

/**
 * Samples to make a {@link SoundAsset} from.
 */
export interface SoundAssetSamples {
  /** Samples per second, e.g. `44100`. */
  sampleRate: number;

  /**
   * One array of samples per channel (one for mono, two for stereo), each
   * in the range -1 to 1, and all the same length.
   */
  channels: readonly Float32Array<ArrayBuffer>[];
}

/**
 * Makes a {@link SoundAsset} from samples, for sounds synthesized or
 * generated at runtime.
 * @param samples - The sample rate and the samples of each channel.
 * @returns The sound.
 * @throws If there are no channels, the channels are empty, or they differ in length.
 */
export function createSoundAsset(samples: SoundAssetSamples): SoundAsset {
  const { sampleRate, channels } = samples;

  if (channels.length === 0) {
    throw new Error('Unable to create a sound asset without any channels.');
  }

  const { length } = channels[0];

  if (length === 0) {
    throw new Error('Unable to create a sound asset from empty channels.');
  }

  if (channels.some((channel) => channel.length !== length)) {
    throw new Error(
      'Unable to create a sound asset: every channel must have the same number of samples.',
    );
  }

  const buffer = new AudioBuffer({
    length,
    numberOfChannels: channels.length,
    sampleRate,
  });

  channels.forEach((channel, index) => {
    buffer.copyToChannel(channel, index);
  });

  return { buffer, durationSeconds: buffer.duration };
}
