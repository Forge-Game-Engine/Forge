import { AudioComponent } from '../components/index.js';
import { Entity, System, World } from '../../ecs/index.js';

/**
 * System to manage and play audio for entities with a AudioComponent.
 */
export class AudioSystem extends System {
  private readonly _world: World;

  /**
   * Creates an instance of AudioSystem.
   */
  constructor(world: World) {
    super('audio', [AudioComponent.symbol]);

    this._world = world;
  }

  /**
   * Runs the audio system for a given entity.
   * @param entity - The entity to update and play sounds for.
   * @returns A promise.
   */
  public run(entity: Entity): void {
    const audioComponent = entity.getComponentRequired<AudioComponent>(
      AudioComponent.symbol,
    );

    if (audioComponent.playSound) {
      audioComponent.sound.play();
      audioComponent.playSound = false;
    }
  }

  /**
   * Stops the audio system and unloads all sounds.
   */
  public stop(): void {
    const allEntitiesWithAudio = this._world.queryEntities([
      AudioComponent.symbol,
    ]);

    for (const entityWithAudio of allEntitiesWithAudio) {
      const audioComponent =
        entityWithAudio.getComponentRequired<AudioComponent>(
          AudioComponent.symbol,
        );
      audioComponent.sound.unload();
    }
  }
}
