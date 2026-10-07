import type { MixerBus } from '../mixer-bus.js';
import type { SoundMixer } from '../sound-mixer.js';

/**
 * The state of a sound instance the mixer needs, to stop every sound when
 * it's stopped.
 */
export interface StoppableInstance {
  stopImmediately(): void;
}

/**
 * The parts of a {@link SoundMixer} that playback needs but games don't.
 */
export interface MixerInternals {
  readonly context: AudioContext;
  /** Every instance currently playing (or fading out) through this mixer. */
  readonly instances: Set<StoppableInstance>;
  /** Set on the first user gesture, and never cleared. */
  hasHadGesture: boolean;
  isStopped: boolean;
}

/**
 * The parts of a {@link MixerBus} that playback needs but games don't.
 */
export interface BusInternals {
  readonly mixer: MixerInternals;
  /** The node sounds and child buses connect to. */
  readonly gain: GainNode;
}

// Keyed by the public objects, so the internals stay out of the public API
// and a bus or mixer that wasn't made by `createSoundMixer` is detected.
const mixerInternals = new WeakMap<SoundMixer, MixerInternals>();
const busInternals = new WeakMap<MixerBus, BusInternals>();

export const registerMixerInternals = (
  mixer: SoundMixer,
  internals: MixerInternals,
): void => {
  mixerInternals.set(mixer, internals);
};

export const registerBusInternals = (
  bus: MixerBus,
  internals: BusInternals,
): void => {
  busInternals.set(bus, internals);
};

/**
 * Gets the internals of a mixer made by `createSoundMixer`.
 * @param mixer - The mixer.
 * @returns Its internals.
 * @throws If `mixer` wasn't made by `createSoundMixer`.
 */
export const getMixerInternals = (mixer: SoundMixer): MixerInternals => {
  const internals = mixerInternals.get(mixer);

  if (!internals) {
    throw new Error(
      'The sound mixer was not made by `createSoundMixer`. Create mixers with `createSoundMixer()`.',
    );
  }

  return internals;
};

/**
 * Gets the internals of a bus made by `SoundMixer.createBus`.
 * @param bus - The bus.
 * @returns Its internals.
 * @throws If `bus` wasn't made by a `SoundMixer`.
 */
export const getBusInternals = (bus: MixerBus): BusInternals => {
  const internals = busInternals.get(bus);

  if (!internals) {
    throw new Error(
      `The bus "${bus.name}" was not made by a sound mixer. Create buses with \`mixer.createBus(name)\`.`,
    );
  }

  return internals;
};

/**
 * Whether a non-looping sound requested now should play. Until the player
 * has interacted with the page, a context that isn't running can't play
 * anything, and a sound effect queued until the first click would play
 * late, together with every other one queued, so it's dropped instead. A
 * context that's already running (the browser allowed autoplay, e.g. after
 * navigating within a site the player already interacted with) plays it.
 * @param mixer - The mixer the sound would play through.
 * @returns `true` if the sound should be started.
 */
export const canStartOneShot = (mixer: MixerInternals): boolean =>
  mixer.hasHadGesture || mixer.context.state === 'running';

/**
 * Throws if `mixer` has been stopped.
 * @param mixer - The mixer a sound would play through.
 * @throws If the mixer has been stopped.
 */
export const assertMixerNotStopped = (mixer: MixerInternals): void => {
  if (mixer.isStopped) {
    throw new Error(
      'Unable to play a sound on a stopped sound mixer. Create a new mixer with `createSoundMixer()`.',
    );
  }
};

/**
 * Throws unless `volume` is a finite gain of at least 0.
 * @param volume - The volume to check.
 * @param owner - What the volume belongs to, for the error message.
 * @throws If `volume` is negative or not finite.
 */
export const assertValidVolume = (volume: number, owner: string): void => {
  if (!Number.isFinite(volume) || volume < 0) {
    throw new Error(
      `The volume of ${owner} must be a finite number of at least 0, got ${volume}.`,
    );
  }
};

/**
 * Throws unless `rate` is a finite playback rate above 0.
 * @param rate - The rate to check.
 * @throws If `rate` is 0 or less, or not finite.
 */
export const assertValidRate = (rate: number): void => {
  if (!Number.isFinite(rate) || rate <= 0) {
    throw new Error(
      `A sound's playback rate must be a finite number above 0, got ${rate}.`,
    );
  }
};

/**
 * How quickly a gain follows a new volume, in seconds: the time constant of
 * `setTargetAtTime`, so the change is about 99% done after five of these.
 * Fast enough to sound immediate, slow enough not to click.
 */
export const gainSmoothingSeconds = 0.01;

/**
 * Moves `param` smoothly to `value`, replacing any change still scheduled.
 * @param param - The parameter to change.
 * @param value - The value to move to.
 * @param now - The context's current time.
 */
export const smoothParamTo = (
  param: AudioParam,
  value: number,
  now: number,
): void => {
  param.cancelScheduledValues(now);
  param.setTargetAtTime(value, now, gainSmoothingSeconds);
};
