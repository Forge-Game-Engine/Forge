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
  const mock2Component = createMockComponent(Symbol('mock2'));

  beforeEach(() => {
    world = new World('test-world');
  });

  it('should build and add an entity', () => {
    const entity = world.buildAndAddEntity('entity1', [mock1Component]);

    expect(entity.getComponent(mock1Component.name)).not.toBeNull();
  });

  it('should get an entity by its id', () => {
    const entity = world.buildAndAddEntity('entity1', [mock1Component]);
    const retrievedEntity = world.getEntityById(entity.id);
    const nonExistingEntity = world.getEntityById(999);
    expect(entity).toEqual(retrievedEntity);
    expect(nonExistingEntity).toBe(null);
  });

  it('should call runSystem on each system during update with enabled entities', () => {
    const system = new MockSystem('System1', [mock1Component.name]);

    world.addSystem(system);

    const entity1 = world.buildAndAddEntity('entity1', [mock1Component]);
    const entity2 = world.buildAndAddEntity('entity2', [mock1Component]);
    entity2.enabled = false;

    world.update(16);

    // Only enabled entities should be passed
    expect(runMock).toHaveBeenCalledWith(entity1);
    expect(runMock).not.toHaveBeenCalledWith(entity2);
  });

  it('should call runSystem on each system during update with matching entities', () => {
    const system = new MockSystem('System1', [mock1Component.name]);

    const entity1 = world.buildAndAddEntity('entity1', [mock1Component]);
    const entity2 = world.buildAndAddEntity('entity2', [mock2Component]);

    world.addSystem(system);

    world.update(16);

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

    world.buildAndAddEntity('entity1', []);

    expect(callback).not.toHaveBeenCalled();
  });

  it('should return all entities matching the query', () => {
    const entity1 = world.buildAndAddEntity('entity1', [mock1Component]);
    const entity2 = world.buildAndAddEntity('entity2', [
      mock1Component,
      mock2Component,
    ]);
    const entity3 = world.buildAndAddEntity('entity3', [mock2Component]);

    // Query for entities with mock1Component
    const result = world.queryEntities([mock1Component.name]);
    expect(result.has(entity1)).toBe(true);
    expect(result.has(entity2)).toBe(true);
    expect(result.has(entity3)).toBe(false);
    expect(result.size).toBe(2);

    // Query for entities with both mock1Component and mock2Component
    const resultBoth = world.queryEntities([
      mock1Component.name,
      mock2Component.name,
    ]);
    expect(resultBoth.has(entity2)).toBe(true);
    expect(resultBoth.has(entity1)).toBe(false);
    expect(resultBoth.has(entity3)).toBe(false);
    expect(resultBoth.size).toBe(1);

    // Query for entities with mock2Component
    const result2 = world.queryEntities([mock2Component.name]);
    expect(result2.has(entity2)).toBe(true);
    expect(result2.has(entity3)).toBe(true);
    expect(result2.has(entity1)).toBe(false);
    expect(result2.size).toBe(2);

    // Query for a component that no entity has
    const unknownComponent = Symbol('unknown');
    const resultNone = world.queryEntities([unknownComponent]);
    expect(resultNone.size).toBe(0);
  });

  it('should return the first entity matching the query in queryEntity', () => {
    const entity1 = world.buildAndAddEntity('entity1', [mock1Component]);
    const entity2 = world.buildAndAddEntity('entity2', [
      mock1Component,
      mock2Component,
    ]);

    world.buildAndAddEntity('entity3', [mock2Component]);

    // Should return entity1, as it is the first matching entity
    const result = world.queryEntity([mock1Component.name]);
    expect(result).toBe(entity1);

    // Should return entity2, as it is the first entity with both components
    const resultBoth = world.queryEntity([
      mock1Component.name,
      mock2Component.name,
    ]);
    expect(resultBoth).toBe(entity2);

    // Should return entity3, as it is the first entity with mock2Component only
    const result2 = world.queryEntity([mock2Component.name]);
    expect(result2).toBe(entity2); // entity2 is added before entity3 and has mock2Component

    // Should return null if no entity matches
    const unknownComponent = Symbol('unknown');
    const resultNone = world.queryEntity([unknownComponent]);
    expect(resultNone).toBeNull();
  });

  it('should return the first entity matching the query in queryEntityRequired', () => {
    const entity1 = world.buildAndAddEntity('entity1', [mock1Component]);
    const entity2 = world.buildAndAddEntity('entity2', [
      mock1Component,
      mock2Component,
    ]);

    // Should return entity1, as it is the first matching entity
    const result = world.queryEntityRequired([mock1Component.name]);
    expect(result).toBe(entity1);

    // Should return entity2, as it is the first entity with both components
    const resultBoth = world.queryEntityRequired([
      mock1Component.name,
      mock2Component.name,
    ]);
    expect(resultBoth).toBe(entity2);
  });

  it('should throw an error if no entity matches the query in queryEntityRequired', () => {
    world.buildAndAddEntity('entity1', [mock1Component]);

    expect(() => world.queryEntityRequired([mock2Component.name])).toThrowError(
      'No entity found matching the query: mock2',
    );
  });

  it('should build and add an entity with parent parameter', () => {
    const parent = world.buildAndAddEntity('parent', [mock1Component]);
    const child = world.buildAndAddEntity('child', [mock2Component], {
      parent,
    });

    expect(child.parent).toBe(parent);
    expect(parent.children.has(child)).toBe(true);
  });

  it('should build and add an entity with enabled=false', () => {
    const entity = world.buildAndAddEntity(
      'disabled-entity',
      [mock1Component],
      {
        enabled: false,
      },
    );

    expect(entity.enabled).toBe(false);
    expect(world.getEntityById(entity.id)).toBe(entity);
  });

  it('should build and add an entity with both enabled and parent parameters', () => {
    const parent = world.buildAndAddEntity('parent', [mock1Component]);
    const child = world.buildAndAddEntity('child', [mock2Component], {
      enabled: false,
      parent,
    });

    expect(child.enabled).toBe(false);
    expect(child.parent).toBe(parent);
    expect(parent.children.has(child)).toBe(true);
  });
});
