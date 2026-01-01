import { Entity, System } from '../../ecs/index.js';
import { Time } from '../../common/index.js';
import { LifetimeComponent } from '../components/lifetime-component.js';

/**
 * System that tracks entity lifetime and updates the hasExpired flag.
 * This system only updates the elapsed time and expiration status - it does not remove entities.
 * Removal or other lifecycle actions are handled by separate strategy-specific systems.
 */
export class LifetimeTrackingSystem extends System {
  private readonly _time: Time;

  /**
   * Creates an instance of LifetimeTrackingSystem.
   * @param time - The Time instance.
   */
  constructor(time: Time) {
    super([LifetimeComponent], 'lifetime-tracking');
    this._time = time;
  }

  /**
   * Updates the elapsed time for an entity and sets the hasExpired flag if needed.
   * @param entity - The entity to update.
   */
  public run(entity: Entity): void {
    const lifetimeComponent = entity.getComponentRequired(LifetimeComponent);

    lifetimeComponent.elapsedSeconds += this._time.deltaTimeInSeconds;

    if (lifetimeComponent.elapsedSeconds >= lifetimeComponent.durationSeconds) {
      lifetimeComponent.hasExpired = true;
    }
  }
}
