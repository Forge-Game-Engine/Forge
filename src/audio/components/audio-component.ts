import { Howl } from 'howler';
import { createComponentId } from '../../ecs/ecs-component.js';

/**
 * ECS-style component interface for audio.
 */
export interface AudioEcsComponent {
  sound: Howl;
  playSound: boolean;
}

export const audioId = createComponentId<AudioEcsComponent>('audio');
