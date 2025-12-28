import { Entity, System, World } from '../../ecs/index.js';
import { LifetimeComponent } from '../components/lifetime-component.js';
import { RemoveFromWorldStrategyComponent } from '../strategies/remove-from-world-strategy-component.js';

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
    super(
      [LifetimeComponent, RemoveFromWorldStrategyComponent],
      'remove-from-world-lifecycle',
    );
    this._world = world;
  }

  /**
   * Removes the entity from the world if it has expired.
   * @param entity - The entity to check and potentially remove.
   */
  public run(entity: Entity): void {
    const lifetimeComponent = entity.getComponentRequired(LifetimeComponent);

    if (lifetimeComponent.hasExpired) {
      this._world.removeEntity(entity);
    }
  }
}
