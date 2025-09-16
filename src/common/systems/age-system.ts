import { Entity, System, World } from '../../ecs';
import { Time } from '../../common';
import { AgeComponent } from '../../common/components/age-component';

/**
 * System that manages and updates entity aging and lifetime.
 * Removes entities from the world once they have existed longer than their lifetime.
 */
export class AgeSystem extends System {
  private readonly _time: Time;
  private readonly _world: World;

  /**
   * Creates an instance of AgeSystem.
   * @param world - The World instance.
   */
  constructor(world: World) {
    super('Age', [AgeComponent.symbol]);
    this._time = world.time;
    this._world = world;
  }

  /**
   * Runs the age system for a given entity, removing it if its age exceeds its lifetime.
   * @param entity - The entity to update the age for.
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
