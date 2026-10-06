import { AudioBus, MixerState, toAudioBus } from './internal/audio-bus.js';
import type { MixerBus } from './mixer-bus.js';
import type { Voice } from './internal/voice.js';

/**
 * The state of a {@link SoundMixer}'s `AudioContext`. `'interrupted'` is
 * reported by Safari while another app or a call has taken the audio
 * output.
 */
export type SoundMixerState =
  'suspended' | 'running' | 'interrupted' | 'closed';

/**
 * Owns a game's browser `AudioContext` and the tree of {@link MixerBus}es
 * every sound plays through. Create one per game with
 * {@link createSoundMixer}.
 */
export interface SoundMixer {
  /** The root bus. Every other bus feeds it, directly or through its parent. */
  readonly master: MixerBus;

  /** The state of the mixer's `AudioContext`. */
  readonly state: SoundMixerState;

  /**
   * Creates a bus that feeds `parent`.
   * @param name - The bus's name, unique within this mixer.
   * @param parent - The bus to feed. Defaults to `master`.
   * @returns The new bus, at volume `1` and not muted.
   * @throws An error if a bus named `name` already exists, or `parent`
   * belongs to a different mixer.
   */
  createBus(name: string, parent?: MixerBus): MixerBus;

  /**
   * Returns the bus named `name`.
   * @param name - The bus's name.
   * @returns The bus.
   * @throws An error if this mixer has no bus named `name`.
   */
  getBus(name: string): MixerBus;

  /**
   * Suspends the `AudioContext`: every sound holds its position and is
   * silent until {@link SoundMixer.resume}. While suspended this way, user
   * input doesn't resume it.
   * @returns A promise that resolves once the context is suspended.
   */
  suspend(): Promise<void>;

  /**
   * Resumes the `AudioContext` after {@link SoundMixer.suspend}.
   * @returns A promise that resolves once the context is running. The
   * browser keeps it pending until the page has had user input.
   */
  resume(): Promise<void>;

  /**
   * Stops every sound, stops listening for user input and closes the
   * `AudioContext`. The mixer and its buses can't be used afterwards.
   * @returns A promise that resolves once the context is closed.
   */
  stop(): Promise<void>;
}

/**
 * The events that count as user activation, which browsers require before
 * they let an `AudioContext` start. A touch activates on its end, not its
 * start.
 */
const unlockEvents = ['pointerup', 'touchend', 'click', 'keydown'] as const;

/**
 * Creates a {@link SoundMixer} with a `master` bus.
 *
 * Browsers keep audio suspended until the page has had user input. The
 * mixer listens on `window` for `pointerup`, `touchend`, `click` and
 * `keydown`, and resumes the context on each one until it's running. It
 * listens again whenever the context is suspended or interrupted by
 * anything other than {@link SoundMixer.suspend}, for example Safari
 * during a phone call.
 * @param context - The `AudioContext` to play through. Defaults to a new
 * one.
 * @returns The mixer.
 */
export function createSoundMixer(
  context: AudioContext = new AudioContext(),
): SoundMixer {
  const voices = new Set<Voice>();
  const buses = new Map<string, AudioBus>();
  let isSuspendedByGame = false;
  let isListening = false;

  const state: MixerState = {
    context,
    voices,
    // The browser's own record of whether the page has had user
    // activation (the same "sticky activation" its autoplay policy
    // checks), so a sound triggered by the input that unlocks audio plays,
    // even though the context only reports `'running'` once its
    // asynchronous resume finishes.
    isUnlocked: () =>
      navigator.userActivation.hasBeenActive || context.state === 'running',
  };

  const onUserInput = (event: Event): void => {
    // Escape doesn't count as user activation, so resuming from it fails.
    if (event instanceof KeyboardEvent && event.key === 'Escape') {
      return;
    }

    // A resume from an event the browser doesn't count as activation
    // rejects; the next event tries again.
    context.resume().catch(() => {});
  };

  const listen = (): void => {
    if (isListening) {
      return;
    }

    isListening = true;

    for (const type of unlockEvents) {
      window.addEventListener(type, onUserInput, { capture: true });
    }
  };

  const stopListening = (): void => {
    if (!isListening) {
      return;
    }

    isListening = false;

    for (const type of unlockEvents) {
      window.removeEventListener(type, onUserInput, { capture: true });
    }
  };

  const onStateChange = (): void => {
    const contextState: SoundMixerState = context.state;

    if (contextState === 'running') {
      stopListening();

      return;
    }

    if (contextState === 'closed' || isSuspendedByGame) {
      return;
    }

    listen();
  };

  context.addEventListener('statechange', onStateChange);
  onStateChange();

  const master = new AudioBus('master', null, state);

  buses.set(master.name, master);

  return {
    master,
    get state(): SoundMixerState {
      return context.state;
    },
    createBus: (name, parent = master) => {
      if (buses.has(name)) {
        throw new Error(
          `Unable to create bus "${name}", the mixer already has a bus with that name.`,
        );
      }

      const parentBus = toAudioBus(parent);

      if (parentBus.mixer !== state) {
        throw new Error(
          `Unable to create bus "${name}" under bus "${parent.name}", the parent belongs to a different mixer.`,
        );
      }

      const bus = new AudioBus(name, parentBus, state);

      buses.set(name, bus);

      return bus;
    },
    getBus: (name) => {
      const bus = buses.get(name);

      if (!bus) {
        throw new Error(`The mixer has no bus named "${name}".`);
      }

      return bus;
    },
    suspend: async () => {
      isSuspendedByGame = true;
      stopListening();
      await context.suspend();
    },
    resume: async () => {
      isSuspendedByGame = false;
      onStateChange();
      await context.resume();
    },
    stop: async () => {
      for (const voice of [...voices]) {
        voice.stop();
      }

      stopListening();
      context.removeEventListener('statechange', onStateChange);

      if (context.state !== 'closed') {
        await context.close();
      }
    },
  };
}
