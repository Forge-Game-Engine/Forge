import { Howl } from 'howler';
import { createComponentId } from '../../ecs/ecs-component.js';

/**
 * ECS-style component interface for audio.
 */
export interface AudioEcsComponent {
  /**
   * The Howler.js sound to play.
   *
   * @see {@link https://github.com/goldfire/howler.js#documentation | Howler.js Documentation}
   */
  sound: Howl;

  /**
   * Set to `true` to play `sound` on the next `createAudioEcsSystem` update.
   * The system resets this back to `false` once playback has started.
   */
  playSound: boolean;
}

export const audioId = createComponentId<AudioEcsComponent>('audio');
