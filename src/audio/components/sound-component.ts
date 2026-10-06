import { createComponentId } from '../../ecs/ecs-component.js';
import { EcsWorld } from '../../ecs/ecs-world.js';
import type { MixerBus } from '../mixer-bus.js';
import type { SoundAsset } from '../sound-asset.js';

/**
 * Fields of {@link SoundEcsComponent} with no sensible default; callers
 * must always provide these.
 */
export interface SoundRequiredOptions {
  /**
   * The sound to play. Replacing it stops the current sound and starts the
   * new one from the beginning.
   */
  sound: SoundAsset;

  /**
   * The bus to play through. Changing it moves the playing sound to the new
   * bus without restarting it. Must belong to the same mixer.
   */
  bus: MixerBus;
}

/**
 * Fields of {@link SoundEcsComponent} with a sensible default that callers
 * set; callers may omit these.
 */
export interface SoundDefaultedOptions {
  /** The sound's own linear gain, multiplied with every bus's gain. */
  volume: number;

  /** Playback speed. Also shifts pitch: `2` is twice as fast, an octave up. */
  rate: number;

  /** Whether the sound starts again from the beginning when it ends. */
  loop: boolean;

  /**
   * Pauses the sound at its current position. Clearing it resumes the sound
   * from that position.
   */
  paused: boolean;
}

/**
 * ECS-style component for a sound that belongs to an entity: it plays
 * while the entity has the component, and stops when the component or the
 * entity is removed. Played by `createSoundEcsSystem`.
 */
export interface SoundEcsComponent
  extends SoundRequiredOptions, SoundDefaultedOptions {
  /**
   * Output, written only by `createSoundEcsSystem`: `true` once a
   * non-looping sound has played to its end, or was dropped because it
   * was added before the page had user input. The sound doesn't play
   * again; add a new component to play it again.
   */
  hasFinished: boolean;
}

export const soundId = createComponentId<SoundEcsComponent>('sound');

const defaultSoundOptions: SoundDefaultedOptions = {
  volume: 1,
  rate: 1,
  loop: false,
  paused: false,
};

/**
 * Attaches a {@link SoundEcsComponent} to `entity`. The sound starts on
 * the next `createSoundEcsSystem` update.
 * @param world - The ECS world `entity` belongs to.
 * @param entity - The entity to attach the component to.
 * @param options - The sound, its bus, and how to play it. `sound` and
 * `bus` have no sensible default and must always be provided.
 * @returns The attached component, for further tuning or runtime changes.
 */
export function addSoundComponent(
  world: EcsWorld,
  entity: number,
  options: SoundRequiredOptions & Partial<SoundDefaultedOptions>,
): SoundEcsComponent {
  const component: SoundEcsComponent = {
    ...defaultSoundOptions,
    ...options,
    hasFinished: false,
  };

  return world.addComponent(entity, soundId, component);
}
