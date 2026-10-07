import { createMixerBus } from './internal/create-mixer-bus.js';
import {
  getBusInternals,
  MixerInternals,
  registerMixerInternals,
} from './internal/audio-internals.js';
import type { MixerBus } from './mixer-bus.js';

/**
 * The state of a {@link SoundMixer}'s audio. `'interrupted'` is reported by
 * Safari while another app (or a phone call) has taken over audio.
 */
export type SoundMixerState = AudioContextState | 'interrupted';

/**
 * Owns a game's audio output: the browser's `AudioContext` and a tree of
 * {@link MixerBus | buses} under a `master` bus. Create one per game with
 * {@link createSoundMixer}.
 */
export interface SoundMixer {
  /** The root bus. Every other bus, and so every sound, ends up here. */
  readonly master: MixerBus;

  /**
   * The state of the mixer's audio. Browsers start audio `'suspended'`
   * until the player interacts with the page; the mixer resumes it on the
   * first click, tap or key press.
   */
  readonly state: SoundMixerState;

  /**
   * Creates a bus that feeds into `parent`.
   * @param name - The bus's name, unique within this mixer.
   * @param parent - The bus to feed into. Defaults to `master`.
   * @returns The new bus.
   * @throws If a bus named `name` already exists, or `parent` belongs to a different mixer.
   */
  createBus(name: string, parent?: MixerBus): MixerBus;

  /**
   * Gets a bus by name.
   * @param name - The bus's name. `'master'` returns the master bus.
   * @returns The bus.
   * @throws If this mixer has no bus named `name`.
   */
  getBus(name: string): MixerBus;

  /**
   * Pauses all audio, for example while the game is paused or its tab is
   * hidden. Sounds continue from the same place on {@link SoundMixer.resume}.
   * The mixer doesn't resume on its own while suspended this way.
   * @returns A promise that resolves once audio is suspended.
   */
  suspend(): Promise<void>;

  /**
   * Resumes audio after {@link SoundMixer.suspend}.
   * @returns A promise that resolves once audio is running.
   */
  resume(): Promise<void>;

  /**
   * Stops every sound, closes the `AudioContext` and stops listening for
   * user gestures. The mixer can't play sounds afterwards. Does nothing if
   * the mixer is already stopped.
   * @returns A promise that resolves once the context is closed.
   */
  stop(): Promise<void>;
}

// The events that can unlock audio. Per the HTML specification a touch
// activates the page on release (`pointerup`/`touchend`), not on press, and
// Escape doesn't count as a key press for this.
const gestureEvents = ['pointerup', 'touchend', 'click', 'keydown'] as const;

const gestureListenerOptions: AddEventListenerOptions = {
  capture: true,
  passive: true,
};

/**
 * Creates a {@link SoundMixer} with a `master` bus.
 *
 * Browsers don't play audio until the player has interacted with the page.
 * The mixer listens for the first click, tap or key press and resumes audio
 * then, and again whenever audio stops without the game asking (Safari
 * interrupts it for calls and other apps). Stop the mixer with
 * {@link SoundMixer.stop} when the game is torn down.
 * @param context - The audio context to play through. Defaults to a new `AudioContext`.
 * @returns The mixer.
 */
export function createSoundMixer(
  context: AudioContext = new AudioContext(),
): SoundMixer {
  const internals: MixerInternals = {
    context,
    instances: new Set(),
    hasHadGesture: false,
    isStopped: false,
  };

  const buses = new Map<string, MixerBus>();
  let isSuspendedByGame = false;
  let isListeningForGestures = false;

  const master = createMixerBus(internals, 'master', null, context.destination);

  buses.set(master.name, master);

  const getState = (): SoundMixerState => context.state;

  const handleGesture = (event: Event): void => {
    if (event instanceof KeyboardEvent && event.key === 'Escape') {
      return;
    }

    internals.hasHadGesture = true;

    if (!isSuspendedByGame && getState() !== 'running') {
      // A resume from an event the browser doesn't count as a gesture fails;
      // the listeners stay until audio actually runs.
      context.resume().catch(() => {});
    }
  };

  const startListening = (): void => {
    if (isListeningForGestures) {
      return;
    }

    isListeningForGestures = true;

    for (const type of gestureEvents) {
      window.addEventListener(type, handleGesture, gestureListenerOptions);
    }
  };

  const stopListening = (): void => {
    if (!isListeningForGestures) {
      return;
    }

    isListeningForGestures = false;

    for (const type of gestureEvents) {
      window.removeEventListener(type, handleGesture, gestureListenerOptions);
    }
  };

  const handleStateChange = (): void => {
    const state = getState();

    if (state === 'running') {
      stopListening();

      return;
    }

    if (state !== 'closed' && !isSuspendedByGame) {
      startListening();
    }
  };

  const assertNotStopped = (action: string): void => {
    if (internals.isStopped) {
      throw new Error(`Unable to ${action}: the sound mixer has been stopped.`);
    }
  };

  context.addEventListener('statechange', handleStateChange);
  handleStateChange();

  const mixer: SoundMixer = {
    master,
    get state(): SoundMixerState {
      return getState();
    },
    createBus(name: string, parent: MixerBus = master): MixerBus {
      assertNotStopped(`create the bus "${name}"`);

      if (buses.has(name)) {
        throw new Error(
          `Unable to create the bus "${name}": the mixer already has a bus with that name.`,
        );
      }

      const parentInternals = getBusInternals(parent);

      if (parentInternals.mixer !== internals) {
        throw new Error(
          `Unable to create the bus "${name}": its parent "${parent.name}" belongs to a different sound mixer.`,
        );
      }

      const bus = createMixerBus(internals, name, parent, parentInternals.gain);

      buses.set(name, bus);

      return bus;
    },
    getBus(name: string): MixerBus {
      const bus = buses.get(name);

      if (!bus) {
        throw new Error(`The sound mixer has no bus named "${name}".`);
      }

      return bus;
    },
    suspend: async (): Promise<void> => {
      assertNotStopped('suspend audio');
      isSuspendedByGame = true;
      stopListening();
      await context.suspend();
    },
    resume: async (): Promise<void> => {
      assertNotStopped('resume audio');
      isSuspendedByGame = false;
      handleStateChange();
      await context.resume();
    },
    stop: async (): Promise<void> => {
      if (internals.isStopped) {
        return;
      }

      internals.isStopped = true;
      stopListening();
      context.removeEventListener('statechange', handleStateChange);

      for (const instance of [...internals.instances]) {
        instance.stopImmediately();
      }

      if (getState() !== 'closed') {
        await context.close();
      }
    },
  };

  registerMixerInternals(mixer, internals);

  return mixer;
}
