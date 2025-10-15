import { Entity, System, World } from '../../ecs';
import { LifetimeComponent } from '../components/lifetime-component';
import { RemoveFromWorldStrategyComponent } from '../strategies/remove-from-world-strategy-component';

/**
 * System that removes entities from the world when they have expired.
 * This system handles only the RemoveFromWorldStrategy - it queries for entities
 * with both LifetimeComponent and RemoveFromWorldStrategyComponent.
 */
export class RemoveFromWorldLifecycleSystem extends System {
  private readonly _world: World;

  /**
   * Creates an instance of RemoveFromWorldLifecycleSystem.
   * @param world - The World instance.
   */
  constructor(world: World) {
    super('RemoveFromWorldLifecycle', [
      LifetimeComponent.symbol,
      RemoveFromWorldStrategyComponent.symbol,
    ]);
    this._world = world;
  }

  /**
   * Removes the entity from the world if it has expired.
   * @param entity - The entity to check and potentially remove.
   */
  public run(entity: Entity): void {
    const lifetimeComponent = entity.getComponentRequired<LifetimeComponent>(
      LifetimeComponent.symbol,
    );

    if (lifetimeComponent.hasExpired) {
      this._world.removeEntity(entity);
    }
  }
}
