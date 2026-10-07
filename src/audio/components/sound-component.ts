import { createComponentId } from '../../ecs/ecs-component.js';
import { EcsWorld } from '../../ecs/ecs-world.js';
import type { MixerBus } from '../mixer-bus.js';
import type { SoundAsset } from '../sound-asset.js';

/**
 * Fields of {@link SoundEcsComponent} with no sensible default; callers must
 * always provide these.
 */
export interface SoundRequiredOptions {
  /** The sound to play. Changing it starts the new sound from the beginning. */
  sound: SoundAsset;

  /**
   * The bus to play through. Changing it moves the playing sound to the new
   * bus without restarting it. Must be a bus of the same mixer.
   */
  bus: MixerBus;
}

/**
 * Fields of {@link SoundEcsComponent} with a sensible default; callers may
 * omit these.
 */
export interface SoundDefaultedOptions {
  /** The sound's own gain, multiplied by its bus's. Changes ramp smoothly. */
  volume: number;

  /** The playback rate. Also shifts the pitch: 2 is an octave up. */
  rate: number;

  /** Whether the sound repeats. Can be changed while it plays. */
  loop: boolean;

  /**
   * Pauses the sound where it is. Clearing it resumes from the same place.
   */
  paused: boolean;
}

/**
 * A sound that belongs to an entity: it plays while the entity has this
 * component, and stops when the component or the entity is removed.
 * `createSoundEcsSystem` plays it.
 */
export interface SoundEcsComponent
  extends SoundRequiredOptions, SoundDefaultedOptions {
  /**
   * Output, written only by `createSoundEcsSystem`: `true` once a
   * non-looping sound has played to its end, was dropped because the player
   * hadn't interacted with the page yet, or its mixer was stopped. Nothing
   * more plays after that; to play the sound again, add a new component.
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
 * Attaches a {@link SoundEcsComponent} to `entity`.
 * @param world - The ECS world `entity` belongs to.
 * @param entity - The entity to attach the component to.
 * @param options - The sound, its bus, and how to play it. `sound` and
 * `bus` have no sensible default and must always be provided.
 * @returns The attached component, for runtime changes.
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
