import { SoundComponent } from 'forge/audio/components';
import { Entity, System } from 'forge/ecs';

/**
 * System to manage and play sounds for entities with a SoundComponent.
 */
export class AudioSystem extends System {
  /**
   * Creates an instance of AudioSystem.
   */
  constructor() {
    super('sound', [SoundComponent.symbol]);
  }

  /**
   * Runs the audio system for a given entity.
   * @param entity - The entity to update and play sounds for.
   * @returns A promise.
   */
  public run(entity: Entity): void {
    const soundComponent = entity.getComponentRequired<SoundComponent>(
      SoundComponent.symbol,
    );

    if (soundComponent.playSound) {
      soundComponent.sound.play();
      soundComponent.playSound = false;
    }
  }
}
