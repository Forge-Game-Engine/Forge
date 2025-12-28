import { beforeEach, describe, expect, it, vi } from 'vitest';
import { System } from './System';
import { Entity } from '../entity';
import { World } from '../world';
import { PositionComponent } from '../../common';

class TestSystem extends System {
  public run(): void {
    // Implement the abstract method for testing
  }
}

describe('System', () => {
  let system: TestSystem;
  let entities: Entity[];
  let world: World;

  beforeEach(() => {
    world = new World('TestWorld');
    system = new TestSystem([PositionComponent], 'TestSystem');
    entities = [new Entity(world, []), new Entity(world, [])];
  });

  it('should initialize with given name and components', () => {
    expect(system.name).toBe('TestSystem');
    expect(system.query.length).toBe(1);
  });

  it('should initialize with default name', () => {
    const defaultSystem = new TestSystem([]);
    expect(defaultSystem.name).toBe('<anonymous system>');
  });

  it('should run system on enabled entities', () => {
    const runSpy = vi.spyOn(system, 'run');
    system.runSystem(entities);
    expect(runSpy).toHaveBeenCalledTimes(2);
  });

  it('should not run system if it is disabled', () => {
    system.isEnabled = false;
    const runSpy = vi.spyOn(system, 'run');
    system.runSystem(entities);
    expect(runSpy).not.toHaveBeenCalled();
  });

  it('should call beforeAll hook before running system', () => {
    const beforeAllSpy = vi.spyOn(system, 'beforeAll');
    system.runSystem(entities);
    expect(beforeAllSpy).toHaveBeenCalledWith(entities);
  });

  it('should stop the system', () => {
    const stopSpy = vi.spyOn(system, 'stop');
    system.stop();
    expect(stopSpy).toHaveBeenCalled();
  });
});
