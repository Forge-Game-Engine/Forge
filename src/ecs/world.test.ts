import { beforeEach, describe, expect, it, vi } from 'vitest';
import { World } from './world';
import { Entity } from './entity';
import { Component, System } from './types';

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

  class MockComponent1 extends Component {}
  class MockComponent2 extends Component {}

  beforeEach(() => {
    world = new World('test-world');
  });

  it('should build and add an entity', () => {
    const entity = world.buildAndAddEntity([new MockComponent1()]);

    expect(entity.getComponent(MockComponent1)).not.toBeNull();
  });

  it('should get an entity by its id', () => {
    const entity = world.buildAndAddEntity([new MockComponent1()]);
    const retrievedEntity = world.getEntityById(entity.id);
    const nonExistingEntity = world.getEntityById(999);
    expect(entity).toEqual(retrievedEntity);
    expect(nonExistingEntity).toBe(null);
  });

  it('should call runSystem on each system during update with enabled entities', () => {
    const system = new MockSystem([MockComponent1]);

    world.addSystem(system);

    const entity1 = world.buildAndAddEntity([new MockComponent1()]);
    const entity2 = world.buildAndAddEntity([new MockComponent1()]);
    entity2.enabled = false;

    world.update();

    // Only enabled entities should be passed
    expect(runMock).toHaveBeenCalledWith(entity1);
    expect(runMock).not.toHaveBeenCalledWith(entity2);
  });

  it('should call runSystem on each system during update with matching entities', () => {
    const system = new MockSystem([MockComponent1]);

    const entity1 = world.buildAndAddEntity([new MockComponent1()]);
    const entity2 = world.buildAndAddEntity([new MockComponent2()]);

    world.addSystem(system);

    world.update();

    // Only enabled entities should be passed
    expect(runMock).toHaveBeenCalledWith(entity1);
    expect(runMock).not.toHaveBeenCalledWith(entity2);
  });

  it('should call stop on all systems when stopped', () => {
    const system1 = new MockSystem([MockComponent1]);
    const system2 = new MockSystem([MockComponent1]);
    world.addSystems(system1, system2);

    world.stop();

    expect(stopMock).toHaveBeenCalledTimes(2);
  });

  it('should remove onEntitiesChanged callbacks', () => {
    const callback = vi.fn();
    world.onEntitiesChanged(callback);
    world.removeOnEntitiesChangedCallback(callback);

    world.buildAndAddEntity([]);

    expect(callback).not.toHaveBeenCalled();
  });

  it('should return all entities matching the query', () => {
    const entity1 = world.buildAndAddEntity([new MockComponent1()]);
    const entity2 = world.buildAndAddEntity([
      new MockComponent1(),
      new MockComponent2(),
    ]);
    const entity3 = world.buildAndAddEntity([new MockComponent2()]);

    // Query for entities with mock1Component
    const result = world.queryEntities([MockComponent1]);
    expect(result.has(entity1)).toBe(true);
    expect(result.has(entity2)).toBe(true);
    expect(result.has(entity3)).toBe(false);
    expect(result.size).toBe(2);

    // Query for entities with both mock1Component and mock2Component
    const resultBoth = world.queryEntities([MockComponent1, MockComponent2]);
    expect(resultBoth.has(entity2)).toBe(true);
    expect(resultBoth.has(entity1)).toBe(false);
    expect(resultBoth.has(entity3)).toBe(false);
    expect(resultBoth.size).toBe(1);

    // Query for entities with mock2Component
    const result2 = world.queryEntities([MockComponent2]);
    expect(result2.has(entity2)).toBe(true);
    expect(result2.has(entity3)).toBe(true);
    expect(result2.has(entity1)).toBe(false);
    expect(result2.size).toBe(2);
  });

  it('should return the first entity matching the query in queryEntity', () => {
    const entity1 = world.buildAndAddEntity([new MockComponent1()]);
    const entity2 = world.buildAndAddEntity([
      new MockComponent1(),
      new MockComponent2(),
    ]);

    world.buildAndAddEntity([new MockComponent2()]);

    // Should return entity1, as it is the first matching entity
    const result = world.queryEntity([MockComponent1]);
    expect(result).toBe(entity1);

    // Should return entity2, as it is the first entity with both components
    const resultBoth = world.queryEntity([MockComponent1, MockComponent2]);
    expect(resultBoth).toBe(entity2);

    // Should return entity3, as it is the first entity with mock2Component only
    const result2 = world.queryEntity([MockComponent2]);
    expect(result2).toBe(entity2); // entity2 is added before entity3 and has mock2Component
  });

  it('should return the first entity matching the query in queryEntityRequired', () => {
    const entity1 = world.buildAndAddEntity([new MockComponent1()]);
    const entity2 = world.buildAndAddEntity([
      new MockComponent1(),
      new MockComponent2(),
    ]);

    // Should return entity1, as it is the first matching entity
    const result = world.queryEntityRequired([MockComponent1]);
    expect(result).toBe(entity1);

    // Should return entity2, as it is the first entity with both components
    const resultBoth = world.queryEntityRequired([
      MockComponent1,
      MockComponent2,
    ]);
    expect(resultBoth).toBe(entity2);
  });

  it('should throw an error if no entity matches the query in queryEntityRequired', () => {
    world.buildAndAddEntity([new MockComponent1()]);

    expect(() => world.queryEntityRequired([MockComponent2])).toThrowError(
      'No entity found matching the query: MockComponent2',
    );
  });

  it('should build and add an entity with parent parameter', () => {
    const parent = world.buildAndAddEntity([new MockComponent1()]);
    const child = world.buildAndAddEntity([new MockComponent2()], {
      parent,
    });

    expect(child.parent).toBe(parent);
    expect(parent.children.has(child)).toBe(true);
  });

  it('should build and add an entity with enabled=false', () => {
    const entity = world.buildAndAddEntity([new MockComponent1()], {
      enabled: false,
    });

    expect(entity.enabled).toBe(false);
    expect(world.getEntityById(entity.id)).toBe(entity);
  });

  it('should build and add an entity with both enabled and parent parameters', () => {
    const parent = world.buildAndAddEntity([new MockComponent1()]);
    const child = world.buildAndAddEntity([new MockComponent2()], {
      enabled: false,
      parent,
    });

    expect(child.enabled).toBe(false);
    expect(child.parent).toBe(parent);
    expect(parent.children.has(child)).toBe(true);
  });

  it('should remove an entity and its children recursively', () => {
    const parent = world.buildAndAddEntity([new MockComponent1()]);
    const child = world.buildAndAddEntity([new MockComponent1()], {
      parent,
    });
    const grandchild = world.buildAndAddEntity([new MockComponent1()], {
      parent: child,
    });

    expect(world.getEntityById(parent.id)).toBe(parent);
    expect(world.getEntityById(child.id)).toBe(child);
    expect(world.getEntityById(grandchild.id)).toBe(grandchild);

    world.removeEntity(parent);

    expect(world.getEntityById(parent.id)).toBeNull();
    expect(world.getEntityById(child.id)).toBeNull();
    expect(world.getEntityById(grandchild.id)).toBeNull();
  });

  it('should remove entity from systems when removed', () => {
    const system = new MockSystem([MockComponent1]);
    world.addSystem(system);

    runMock.mockClear();
    const entity = world.buildAndAddEntity([new MockComponent1()]);

    // ensure system sees the entity initially
    world.update();
    expect(runMock).toHaveBeenCalledWith(entity);

    runMock.mockClear();
    world.removeEntity(entity);

    // after removal the system should no longer receive the entity
    world.update();
    expect(runMock).not.toHaveBeenCalled();
  });

  it('should raise onEntitiesChanged for each removed entity during recursive removal', () => {
    const callback = vi.fn();
    world.onEntitiesChanged(callback);

    const parent = world.buildAndAddEntity([new MockComponent1()]);
    world.buildAndAddEntity([new MockComponent1()], {
      parent,
    });

    callback.mockClear();

    world.removeEntity(parent);

    // removeEntity is called for child then parent, so the callback should be invoked twice
    expect(callback).toHaveBeenCalledTimes(2);
  });

  it('should not throw when adding the same system instance twice and should warn', () => {
    const system = new MockSystem([MockComponent1]);

    world.addSystem(system);

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(() => world.addSystem(system)).not.toThrow();
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});
