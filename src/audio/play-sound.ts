import type { MixerBus } from './mixer-bus.js';
import type { SoundAsset } from './sound-asset.js';
import { toAudioBus } from './audio-bus.js';
import { SoundPlayback } from './sound-playback.js';

/**
 * Options for {@link playSound}.
 */
export interface PlaySoundOptions {
  /** The sound's own linear gain, multiplied with every bus's gain. */
  volume: number;

  /** Playback speed. Also shifts pitch: `2` is twice as fast, an octave up. */
  rate: number;

  /** Whether the sound starts again from the beginning when it ends. */
  loop: boolean;
}

const defaultPlaySoundOptions: PlaySoundOptions = {
  volume: 1,
  rate: 1,
  loop: false,
};

/**
 * A sound started by {@link playSound}.
 */
export interface PlayingSound {
  /**
   * The sound's own linear gain. Changes ramp over a few milliseconds, so
   * they don't click.
   */
  volume: number;

  /**
   * Whether the sound is playing: `false` once it has ended, been stopped,
   * or if it was dropped because the page hadn't had user input yet.
   */
  readonly isPlaying: boolean;

  /**
   * Fades the sound out over a few milliseconds and stops it. Does nothing
   * if it has already stopped.
   */
  stop(): void;
}

/**
 * Plays `sound` through `bus`. Any number of plays of the same sound can
 * overlap.
 *
 * Until the page has had user input, browsers keep audio silent. A looping
 * sound played before then starts, and becomes audible from its beginning
 * once audio is unlocked. A non-looping sound played before then is
 * dropped: the returned sound's `isPlaying` is `false`.
 * @param bus - The bus to play through.
 * @param sound - The sound to play.
 * @param options - The sound's volume, playback rate and looping.
 * @returns The playing sound, to change its volume or stop it.
 * @throws An error if `bus` wasn't created by a sound mixer.
 */
export function playSound(
  bus: MixerBus,
  sound: SoundAsset,
  options: Partial<PlaySoundOptions> = {},
): PlayingSound {
  const settings: PlaySoundOptions = { ...defaultPlaySoundOptions, ...options };
  const playback = new SoundPlayback(toAudioBus(bus), sound, settings);

  playback.start();

  return {
    get volume(): number {
      return playback.volume;
    },
    set volume(value: number) {
      playback.volume = value;
    },
    get isPlaying(): boolean {
      return playback.isPlaying;
    },
    stop: () => {
      playback.stop();
    },
  };
}
