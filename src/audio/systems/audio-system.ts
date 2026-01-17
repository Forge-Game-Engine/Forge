import { AudioEcsComponent, audioId } from '../components/index.js';
import { EcsSystem } from '../../new-ecs/ecs-system.js';

// TODO: needs an unload?

/**
 * Creates an ECS system to handle audio playback.
 * @returns An ECS system that manages audio playback for entities with AudioEcsComponent.
 */
export const createAudioEcsSystem = (): EcsSystem<[AudioEcsComponent]> => ({
  query: [audioId],
  run: (result) => {
    const [audioComponent] = result.components;

    if (audioComponent.playSound) {
      audioComponent.sound.play();
      audioComponent.playSound = false;
    }
  },
});
