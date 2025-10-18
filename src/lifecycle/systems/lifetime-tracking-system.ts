import { Entity, System, World } from 'forge/ecs';
import { Time } from 'forge/common';
import { LifetimeComponent } from 'forge/lifecycle/components/lifetime-component';

/**
 * System that tracks entity lifetime and updates the hasExpired flag.
 * This system only updates the elapsed time and expiration status - it does not remove entities.
 * Removal or other lifecycle actions are handled by separate strategy-specific systems.
 */
export class LifetimeTrackingSystem extends System {
  private readonly _time: Time;

  /**
   * Creates an instance of LifetimeTrackingSystem.
   * @param world - The World instance.
   */
  constructor(world: World) {
    super('LifetimeTracking', [LifetimeComponent.symbol]);
    this._time = world.time;
  }

  /**
   * Updates the elapsed time for an entity and sets the hasExpired flag if needed.
   * @param entity - The entity to update.
   */
  public run(entity: Entity): void {
    const lifetimeComponent = entity.getComponentRequired<LifetimeComponent>(
      LifetimeComponent.symbol,
    );

    lifetimeComponent.elapsedSeconds += this._time.deltaTimeInSeconds;

    if (lifetimeComponent.elapsedSeconds >= lifetimeComponent.durationSeconds) {
      lifetimeComponent.hasExpired = true;
    }
  }
}
