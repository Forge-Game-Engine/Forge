import {
  assertMixerNotStopped,
  assertValidRate,
  assertValidVolume,
  canStartOneShot,
  getBusInternals,
} from './internal/audio-internals.js';
import { SoundInstance } from './internal/sound-instance.js';
import type { MixerBus } from './mixer-bus.js';
import type { SoundAsset } from './sound-asset.js';

/**
 * How {@link playSound} plays a sound.
 */
export interface PlaySoundOptions {
  /** The sound's own gain, multiplied by its bus's and every bus above it. */
  volume: number;

  /** The playback rate. Also shifts the pitch: 2 is an octave up. */
  rate: number;

  /** Whether the sound repeats until stopped. */
  loop: boolean;
}

/**
 * A sound started by {@link playSound}.
 */
export interface PlayingSound {
  /**
   * The sound's own gain. Changes ramp over a few milliseconds.
   * @throws When set to a negative or non-finite number.
   */
  volume: number;

  /**
   * `false` once the sound has played to its end or been stopped, and for a
   * sound that was dropped because the player hadn't interacted with the
   * page yet.
   */
  readonly isPlaying: boolean;

  /** Fades the sound out over a few milliseconds and stops it. */
  stop(): void;
}

const defaultPlaySoundOptions: PlaySoundOptions = {
  volume: 1,
  rate: 1,
  loop: false,
};

/**
 * Plays `sound` on `bus`. Any number of sounds, including the same one, can
 * play at once.
 *
 * Until the player first interacts with the page, browsers keep audio
 * suspended. A looping sound requested before then starts as soon as audio
 * runs; a non-looping one is dropped (its handle reports `isPlaying` as
 * `false`), so a burst of stale sound effects doesn't play on the first
 * click. A sound requested in the handler of that first click plays.
 * @param bus - The bus to play through, which sets which volume and mute settings apply.
 * @param sound - The sound to play.
 * @param options - The volume, rate and looping to play it with.
 * @returns A handle to change the sound's volume or stop it.
 * @throws If the bus's mixer was stopped, or the volume or rate is invalid.
 */
export function playSound(
  bus: MixerBus,
  sound: SoundAsset,
  options: Partial<PlaySoundOptions> = {},
): PlayingSound {
  const { volume, rate, loop } = { ...defaultPlaySoundOptions, ...options };
  const busInternals = getBusInternals(bus);

  assertMixerNotStopped(busInternals.mixer);

  assertValidVolume(volume, 'a sound');
  assertValidRate(rate);

  if (!loop && !canStartOneShot(busInternals.mixer)) {
    return createDroppedSound(volume);
  }

  const instance = new SoundInstance(busInternals, sound, {
    volume,
    rate,
    loop,
    offsetSeconds: 0,
  });

  let currentVolume = volume;

  return {
    get volume(): number {
      return currentVolume;
    },
    set volume(value: number) {
      instance.setVolume(value);
      currentVolume = value;
    },
    get isPlaying(): boolean {
      return instance.isPlaying;
    },
    stop: (): void => {
      instance.stop();
    },
  };
}

const createDroppedSound = (volume: number): PlayingSound => {
  let currentVolume = volume;

  return {
    get volume(): number {
      return currentVolume;
    },
    set volume(value: number) {
      assertValidVolume(value, 'a sound');
      currentVolume = value;
    },
    isPlaying: false,
    stop: (): void => {},
  };
};
