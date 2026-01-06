import { AudioEcsComponent, audioId } from '../components/index.js';
import { EcsSystem } from '../../new-ecs/ecs-system.js';

// TODO: needs an unload?

/**
 * Creates a new ECS-style audio system.
 * @param time - The Time instance.
 * @returns An ECS system that updates animations.
 */
export const createAnimationEcsSystem = (): EcsSystem<[AudioEcsComponent]> => ({
  query: [audioId],
  run: (result) => {
    const [audioComponent] = result.components;

    if (audioComponent.playSound) {
      audioComponent.sound.play();
      audioComponent.playSound = false;
    }
  },
});
