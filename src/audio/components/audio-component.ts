import { Howl } from 'howler';
import { createComponentId } from '../../ecs/ecs-component.js';
import { EcsWorld } from '../../ecs/ecs-world.js';

/**
 * Fields of {@link AudioEcsComponent} with no sensible default; callers must
 * always provide these.
 */
export interface AudioRequiredOptions {
  /**
   * The Howler.js sound to play.
   *
   * @see {@link https://github.com/goldfire/howler.js#documentation | Howler.js Documentation}
   */
  sound: Howl;
}

/**
 * Fields of {@link AudioEcsComponent} with a sensible default; callers may
 * omit these.
 */
export interface AudioDefaultedOptions {
  /**
   * Set to `true` to play `sound` on the next `createAudioEcsSystem` update.
   * The system resets this back to `false` once playback has started.
   */
  playSound: boolean;
}

/**
 * ECS-style component interface for audio.
 */
export interface AudioEcsComponent
  extends AudioRequiredOptions, AudioDefaultedOptions {}

export const audioId = createComponentId<AudioEcsComponent>('audio');

const defaultAudioOptions: AudioDefaultedOptions = {
  playSound: false,
};

/**
 * Attaches a {@link AudioEcsComponent} to `entity`.
 * @param world - The ECS world `entity` belongs to.
 * @param entity - The entity to attach the component to.
 * @param options - Options for configuring the audio. `sound` has no
 * sensible default and must always be provided.
 * @returns The attached component, for further tuning or runtime changes.
 */
export function addAudioComponent(
  world: EcsWorld,
  entity: number,
  options: AudioRequiredOptions & Partial<AudioEcsComponent>,
): AudioEcsComponent {
  const component: AudioEcsComponent = {
    ...defaultAudioOptions,
    ...options,
  };

  return world.addComponent(entity, audioId, component);
}
