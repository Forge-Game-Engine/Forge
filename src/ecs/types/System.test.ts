import { beforeEach, describe, expect, it, vi } from 'vitest';
import { System } from './System';
import { Entity } from '../entity';

class TestSystem extends System {
  public run(): void {
    // Implement the abstract method for testing
  }
}

describe('System', () => {
  let system: TestSystem;
  let entities: Entity[];

  beforeEach(() => {
    system = new TestSystem('TestSystem', [Symbol('TestComponent')]);
    entities = [
      new Entity('Entity1', [], true),
      new Entity('Entity2', [], true),
    ];
  });

  it('should initialize with given name and components', () => {
    expect(system.name).toBe('TestSystem');
    expect(system.operatesOnComponents.length).toBe(1);
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
