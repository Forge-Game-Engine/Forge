import { Entity, System } from '../../ecs/index.js';
import { LifetimeComponent } from '../components/lifetime-component.js';
import { ReturnToPoolStrategyComponent } from '../strategies/return-to-pool-strategy-component.js';

/**
 * System that returns entities to their pool when they have expired.
 * This system handles only the ReturnToPoolStrategy - it queries for entities
 * with both LifetimeComponent and ReturnToPoolStrategyComponent.
 */
export class ReturnToPoolLifecycleSystem extends System {
  /**
   * Creates an instance of ReturnToPoolLifecycleSystem.
   */
  constructor() {
    super(
      [LifetimeComponent, ReturnToPoolStrategyComponent],
      'return-to-pool-lifecycle',
    );
  }

  /**
   * Returns the entity to its pool and removes it from the world if it has expired.
   * @param entity - The entity to check and potentially return to pool.
   */
  public run(entity: Entity): void {
    const lifetimeComponent = entity.getComponentRequired(LifetimeComponent);

    if (lifetimeComponent.hasExpired) {
      const poolStrategyComponent = entity.getComponentRequired(
        ReturnToPoolStrategyComponent,
      );

      // Return to pool
      poolStrategyComponent.pool.release(entity);
    }
  }
}
