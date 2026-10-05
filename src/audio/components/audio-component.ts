import { Howl } from 'howler';
import { createComponentId } from '../../ecs/ecs-component.js';
import type { AudioBus } from '../audio-bus.js';
import { EcsWorld } from '../../ecs/ecs-world.js';

/**
 * Fields of {@link AudioEcsComponent} with no sensible default; callers must
 * always provide these.
 */
export interface AudioRequiredOptions {
  /**
   * The Howler.js sound to play. The component doesn't own it: several
   * components can share one `Howl`, and nothing in the audio module unloads
   * it. Set the volume with {@link AudioDefaultedOptions.volume} rather than
   * the `Howl`'s own `volume` option, which each playback overrides.
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

  /**
   * How loud this component plays `sound`, from 0 (silent) to 1 (as
   * recorded), before its `bus` scales it. Changing it also changes
   * playbacks that have already started.
   */
  volume: number;

  /**
   * The {@link AudioBus} this component's sound plays through, or `null` to
   * play at `volume` alone. Changing it also reroutes playbacks that have
   * already started.
   */
  bus: AudioBus | null;
}

/**
 * ECS-style component interface for audio.
 */
export interface AudioEcsComponent
  extends AudioRequiredOptions, AudioDefaultedOptions {}

export const audioId = createComponentId<AudioEcsComponent>('audio');

const defaultAudioOptions: AudioDefaultedOptions = {
  playSound: false,
  volume: 1,
  bus: null,
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
