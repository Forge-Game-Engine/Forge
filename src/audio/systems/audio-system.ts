import { SoundComponent } from '../components/index.js';
import { Entity, System, World } from '../../ecs/index.js';

/**
 * System to manage and play sounds for entities with a SoundComponent.
 */
export class AudioSystem extends System {
  private readonly _world: World;

  /**
   * Creates an instance of AudioSystem.
   */
  constructor(world: World) {
    super('sound', [SoundComponent.symbol]);

    this._world = world;
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

  /**
   * Stops the audio system and unloads all sounds.
   */
  public stop(): void {
    const allEntitiesWithSound = this._world.queryEntities([
      SoundComponent.symbol,
    ]);

    for (const entityWithSound of allEntitiesWithSound) {
      const soundComponent =
        entityWithSound.getComponentRequired<SoundComponent>(
          SoundComponent.symbol,
        );
      soundComponent.sound.unload();
    }
  }
}
