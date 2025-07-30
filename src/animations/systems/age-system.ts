import { Entity, System, World } from '../../ecs';
import { Time } from '../../common';
import { AgeComponent } from '../components/age-component';

/**
 * System that manages and updates particles.
 */
export class AgeSystem extends System {
  private readonly _time: Time;
  private readonly _world: World;

  /**
   * Creates an instance of ParticleManagerSystem.
   * @param world - The World instance.
   */
  constructor(world: World) {
    super('Age', [AgeComponent.symbol]);
    this._time = world.time;
    this._world = world;
  }

  /**
   * Runs the animation system for a given entity.
   * @param entity - The entity to update animations for.
   */
  public run(entity: Entity): void {
    const ageComponent = entity.getComponentRequired<AgeComponent>(
      AgeComponent.symbol,
    );

    ageComponent.ageSeconds += this._time.deltaTimeInSeconds;

    if (ageComponent.ageSeconds >= ageComponent.lifetimeSeconds) {
      this._world.removeEntity(entity);
    }
  }
}
