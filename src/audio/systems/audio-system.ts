import { AudioEcsComponent, audioId } from '../components/index.js';
import { EcsSystem } from '../../ecs/ecs-system.js';

/**
 * Creates an ECS system to handle audio playback.
 *
 * Each tick, entities with an {@link AudioEcsComponent} whose `playSound` is
 * `true` have `sound.play()` called and `playSound` reset to `false`. When
 * the world stops, any matching entity whose `sound` is still playing has it
 * stopped and unloaded.
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
  cleanupEntities(queryResult) {
    const [audioComponent] = queryResult.components;

    if (audioComponent.sound.playing()) {
      audioComponent.sound.stop();
      audioComponent.sound.unload();
    }
  },
});
