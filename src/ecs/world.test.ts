import { beforeEach, describe, expect, it, vi } from 'vitest';
import { World } from './world';
import { Entity } from './entity';
import { System } from './types';

describe('World', () => {
  let world: World;
  const runMock = vi.fn();
  const stopMock = vi.fn();

  // Mock System
  class MockSystem extends System {
    public run(entity: Entity): void {
      runMock(entity);
    }

    public stop(): void {
      stopMock();
    }
  }

  // Mock Component
  function createMockComponent(name: symbol) {
    return { name };
  }

  const mock1Component = createMockComponent(Symbol('mock1'));
  const mock2Component = createMockComponent(Symbol('mock1'));

  beforeEach(() => {
    world = new World();
  });

  it('should build and add an entity', () => {
    const entity = world.buildAndAddEntity('entity1', [mock1Component]);

    expect(entity.getComponent(mock1Component.name)).not.toBeNull();
  });

  it('should call runSystem on each system during update with enabled entities', () => {
    const system = new MockSystem('System1', [mock1Component.name]);

    const entity1 = new Entity('entity1', [mock1Component]);
    const entity2 = new Entity('entity2', [mock1Component]);
    entity2.enabled = false;

    world.addSystem(system);
    world.addEntity(entity1);
    world.addEntity(entity2);

    world.update();

    // Only enabled entities should be passed
    expect(runMock).toHaveBeenCalledWith(entity1);
    expect(runMock).not.toHaveBeenCalledWith(entity2);
  });

  it('should call runSystem on each system during update with matching entities', () => {
    const system = new MockSystem('System1', [mock1Component.name]);

    const entity1 = new Entity('entity1', [mock1Component]);
    const entity2 = new Entity('entity2', [mock2Component]);

    world.addSystem(system);
    world.addEntity(entity1);
    world.addEntity(entity2);

    world.update();

    // Only enabled entities should be passed
    expect(runMock).toHaveBeenCalledWith(entity1);
    expect(runMock).not.toHaveBeenCalledWith(entity2);
  });

  it('should call stop on all systems when stopped', () => {
    const system1 = new MockSystem('System1', [mock1Component.name]);
    const system2 = new MockSystem('System2', [mock1Component.name]);
    world.addSystems(system1, system2);

    world.stop();

    expect(stopMock).toHaveBeenCalledTimes(2);
  });

  it('should remove onEntitiesChanged callbacks', () => {
    const callback = vi.fn();
    world.onEntitiesChanged(callback);
    world.removeOnEntitiesChangedCallback(callback);

    const entity = new Entity('entity1', []);
    world.addEntity(entity);

    expect(callback).not.toHaveBeenCalled();
  });
});
