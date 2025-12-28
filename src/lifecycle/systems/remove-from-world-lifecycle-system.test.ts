import { beforeEach, describe, expect, it } from 'vitest';
import { RemoveFromWorldLifecycleSystem } from './remove-from-world-lifecycle-system';
import { World } from '../../ecs';
import { LifetimeComponent } from '../components/lifetime-component';
import { RemoveFromWorldStrategyComponent } from '../strategies/remove-from-world-strategy-component';

describe('RemoveFromWorldLifecycleSystem', () => {
  let world: World;

  beforeEach(() => {
    world = new World('test');
  });

  it('should not remove entity when hasExpired is false', () => {
    // Arrange
    const lifetimeComponent = new LifetimeComponent(5);
    const strategyComponent = new RemoveFromWorldStrategyComponent();
    world.buildAndAddEntity([lifetimeComponent, strategyComponent]);
    const system = new RemoveFromWorldLifecycleSystem(world);
    world.addSystem(system);

    // Act
    world.update(0.1);

    // Assert
    expect(world.entityCount).toBe(1);
  });

  it('should remove entity when hasExpired is true', () => {
    // Arrange
    const lifetimeComponent = new LifetimeComponent(5);
    lifetimeComponent.hasExpired = true;
    const strategyComponent = new RemoveFromWorldStrategyComponent();
    world.buildAndAddEntity([lifetimeComponent, strategyComponent]);
    const system = new RemoveFromWorldLifecycleSystem(world);
    world.addSystem(system);

    // Act
    world.update(0.1);

    // Assert
    expect(world.entityCount).toBe(0);
  });

  it('should only process entities with both LifetimeComponent and RemoveFromWorldStrategyComponent', () => {
    // Arrange
    const lifetimeOnlyComponent = new LifetimeComponent(5);
    lifetimeOnlyComponent.hasExpired = true;
    world.buildAndAddEntity([lifetimeOnlyComponent]);

    const lifetimeComponent = new LifetimeComponent(5);
    lifetimeComponent.hasExpired = true;
    const strategyComponent = new RemoveFromWorldStrategyComponent();
    world.buildAndAddEntity([lifetimeComponent, strategyComponent]);

    const system = new RemoveFromWorldLifecycleSystem(world);
    world.addSystem(system);

    // Act
    world.update(0.1);

    // Assert
    expect(world.entityCount).toBe(1); // Only the entity without strategy remains
  });

  it('should handle multiple entities with different expiration states', () => {
    // Arrange
    const expiredComponent1 = new LifetimeComponent(5);
    expiredComponent1.hasExpired = true;
    const strategyComponent1 = new RemoveFromWorldStrategyComponent();
    world.buildAndAddEntity([expiredComponent1, strategyComponent1]);

    const activeComponent = new LifetimeComponent(5);
    activeComponent.hasExpired = false;
    const strategyComponent2 = new RemoveFromWorldStrategyComponent();
    world.buildAndAddEntity([activeComponent, strategyComponent2]);

    const expiredComponent2 = new LifetimeComponent(5);
    expiredComponent2.hasExpired = true;
    const strategyComponent3 = new RemoveFromWorldStrategyComponent();
    world.buildAndAddEntity([expiredComponent2, strategyComponent3]);

    const system = new RemoveFromWorldLifecycleSystem(world);
    world.addSystem(system);

    // Act
    world.update(0.1);

    // Assert
    expect(world.entityCount).toBe(1); // Only active entity remains
  });
});
