import type { MixerBus } from '../mixer-bus.js';
import type { Voice } from './voice.js';

/**
 * The time constant, in seconds, of every gain change the audio module
 * makes (`AudioParam.setTargetAtTime`). Jumping a gain that's playing to a
 * new value cuts the waveform and clicks; approaching it exponentially over
 * a few milliseconds doesn't, and is still too short to hear as a fade.
 */
export const gainRampTimeConstantSeconds = 0.005;

/**
 * How long after a ramp starts the gain is treated as having reached its
 * target. Five time constants leave less than 1% of the original gain.
 */
export const gainRampSettleSeconds = gainRampTimeConstantSeconds * 5;

/**
 * The state a mixer shares with every bus and sound playing through it.
 */
export interface MixerState {
  readonly context: AudioContext;

  /** Every voice that has started and not yet stopped or ended. */
  readonly voices: Set<Voice>;

  /**
   * Whether the page can play sound now, or will as soon as the context
   * finishes resuming: the user has interacted with the page, or the
   * context is already running.
   */
  isUnlocked(): boolean;
}

/**
 * The engine's implementation of {@link MixerBus}. Holds the bus's
 * `GainNode`, which nothing outside the audio module may reach, so `volume`
 * and `muted` stay the only things that set its gain.
 */
export class AudioBus implements MixerBus {
  public readonly name: string;
  public readonly parent: AudioBus | null;
  public readonly mixer: MixerState;
  public readonly node: GainNode;
  private _volume = 1;
  private _muted = false;

  /**
   * Creates a bus and connects it to `parent`, or to the context's
   * destination when `parent` is `null`.
   * @param name - The bus's name.
   * @param parent - The bus to feed, or `null` for a master bus.
   * @param mixer - The mixer the bus belongs to.
   */
  constructor(name: string, parent: AudioBus | null, mixer: MixerState) {
    this.name = name;
    this.parent = parent;
    this.mixer = mixer;
    this.node = mixer.context.createGain();
    this.node.connect(parent ? parent.node : mixer.context.destination);
  }

  get volume(): number {
    return this._volume;
  }

  set volume(value: number) {
    if (!Number.isFinite(value) || value < 0) {
      throw new Error(
        `Unable to set the volume of bus "${this.name}" to ${value}, it must be a finite number of at least 0.`,
      );
    }

    this._volume = value;
    this._applyGain();
  }

  get muted(): boolean {
    return this._muted;
  }

  set muted(value: boolean) {
    this._muted = value;
    this._applyGain();
  }

  private _applyGain(): void {
    this.node.gain.setTargetAtTime(
      this._muted ? 0 : this._volume,
      this.mixer.context.currentTime,
      gainRampTimeConstantSeconds,
    );
  }
}

/**
 * Narrows a {@link MixerBus} to the engine's implementation.
 * @param bus - The bus to narrow.
 * @returns `bus` as an {@link AudioBus}.
 * @throws An error if `bus` wasn't created by a sound mixer.
 */
export function toAudioBus(bus: MixerBus): AudioBus {
  if (!(bus instanceof AudioBus)) {
    throw new Error(
      `Bus "${bus.name}" wasn't created by a sound mixer. Create buses with createSoundMixer().createBus().`,
    );
  }

  return bus;
}
