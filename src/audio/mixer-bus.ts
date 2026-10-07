/**
 * A named stage in a {@link SoundMixer}'s tree that sounds play through.
 * Its volume and mute apply to every sound routed through it, and through
 * the buses under it, including sounds that are already playing. Create
 * buses with {@link SoundMixer.createBus}.
 */
export interface MixerBus {
  /** The bus's name, unique within its mixer. */
  readonly name: string;

  /** The bus this one feeds into, or `null` for the mixer's `master` bus. */
  readonly parent: MixerBus | null;

  /**
   * Linear gain: 0 is silent, 1 leaves sounds unchanged. Changes ramp over
   * a few milliseconds, so they don't click on sounds already playing.
   * @throws When set to a negative or non-finite number.
   */
  volume: number;

  /** Silences the bus without changing {@link MixerBus.volume}. */
  muted: boolean;
}
