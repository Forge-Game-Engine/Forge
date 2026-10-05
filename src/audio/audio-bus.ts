/**
 * A channel of a game's audio mix, such as master, music or sound effects.
 * Every sound routed to a bus (see `AudioEcsComponent.bus`) is scaled by the
 * bus's volume, then by each of its ancestors' in turn, and silenced while
 * the bus or any ancestor is muted. A game builds its own tree, usually a
 * master bus with one child per kind of sound, and binds its volume settings
 * to the buses' fields.
 *
 * Plain data: change `volume` or `muted` at any time, and
 * `createAudioEcsSystem` applies it to every sound playing through the bus on
 * its next update, including ones that are already playing.
 */
export interface AudioBus {
  /** The bus's own volume, from 0 (silent) to 1 (unchanged). */
  volume: number;

  /** Silences the bus and every bus under it, keeping `volume` as it is. */
  muted: boolean;

  /**
   * The bus this one mixes into, or `null` for a root bus such as master.
   * Fixed at creation, so a bus tree can't form a cycle.
   */
  readonly parent: AudioBus | null;
}

/**
 * Options for {@link createAudioBus}.
 */
export type CreateAudioBusOptions = Partial<AudioBus>;

const defaultAudioBusOptions: AudioBus = {
  volume: 1,
  muted: false,
  parent: null,
};

/**
 * Creates an {@link AudioBus}.
 * @param options - The bus's starting volume and mute state, and the bus it
 * mixes into. Defaults to an unmuted root bus at full volume.
 * @returns The bus.
 * @example
 * ```ts
 * const master = createAudioBus();
 * const music = createAudioBus({ parent: master, volume: 0.5 });
 * const effects = createAudioBus({ parent: master });
 * ```
 */
export function createAudioBus(options: CreateAudioBusOptions = {}): AudioBus {
  return { ...defaultAudioBusOptions, ...options };
}

/**
 * Works out how loud `bus` plays its sounds: its volume times each of its
 * ancestors' volumes, or `0` if it or any ancestor is muted.
 * @param bus - The bus to measure.
 * @returns The bus's effective volume, from 0 to 1.
 */
export function getEffectiveBusVolume(bus: AudioBus): number {
  let volume = 1;

  for (let current: AudioBus | null = bus; current; current = current.parent) {
    if (current.muted) {
      return 0;
    }

    volume *= current.volume;
  }

  return volume;
}
