/**
 * A named volume and mute stage in a {@link SoundMixer}. Every sound plays
 * through a bus, and every bus feeds its parent, up to the mixer's `master`
 * bus. A sound's loudness is its own volume multiplied by the gain of every
 * bus between it and the speakers, so changing a bus's `volume` or `muted`
 * applies to every sound routed through it, including sounds already
 * playing.
 *
 * Buses are created with {@link SoundMixer.createBus}.
 */
export interface MixerBus {
  /** The bus's name, unique within its mixer. */
  readonly name: string;

  /** The bus this one feeds, or `null` for the mixer's `master` bus. */
  readonly parent: MixerBus | null;

  /**
   * Linear gain, from `0` (silent) to `1` (unchanged). Values above `1`
   * amplify. Changes ramp over a few milliseconds, so they don't click on
   * sounds that are playing.
   * @throws An error when set to a negative or non-finite value.
   */
  volume: number;

  /**
   * Silences the bus without changing `volume`. Clearing it restores the
   * bus's gain to `volume`.
   */
  muted: boolean;
}
