import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Scene } from './scene';
import { Stoppable, Time } from '../common';
import { Updatable } from './interfaces';

class TestUpdatable implements Updatable {
  public update = vi.fn();
}

class TestStoppable implements Stoppable {
  public stop = vi.fn();
}

describe('Scene', () => {
  let scene: Scene;
  let updatable: TestUpdatable;
  let stoppable: TestStoppable;
  let time: Time;

  beforeEach(() => {
    scene = new Scene('TestScene');
    updatable = new TestUpdatable();
    stoppable = new TestStoppable();
    time = new Time();
  });

  it('should initialize with the given name', () => {
    expect(scene.name).toBe('TestScene');
  });

  it('should update all registered updatable objects', () => {
    scene.registerUpdatable(updatable);
    scene.update(time);
    expect(updatable.update).toHaveBeenCalledWith(time);
  });

  it('should stop all registered stoppable objects', () => {
    scene.registerStoppable(stoppable);
    scene.stop();
    expect(stoppable.stop).toHaveBeenCalled();
  });

  it('should register multiple updatable objects', () => {
    const updatable2 = new TestUpdatable();
    scene.registerUpdatables([updatable, updatable2]);
    scene.update(time);
    expect(updatable.update).toHaveBeenCalledWith(time);
    expect(updatable2.update).toHaveBeenCalledWith(time);
  });

  it('should deregister multiple updatable objects', () => {
    const updatable2 = new TestUpdatable();
    scene.registerUpdatables([updatable, updatable2]);
    scene.deregisterUpdatables([updatable, updatable2]);
    scene.update(time);
    expect(updatable.update).not.toHaveBeenCalled();
    expect(updatable2.update).not.toHaveBeenCalled();
  });

  it('should register multiple stoppable objects', () => {
    const stoppable2 = new TestStoppable();
    scene.registerStoppables([stoppable, stoppable2]);
    scene.stop();
    expect(stoppable.stop).toHaveBeenCalled();
    expect(stoppable2.stop).toHaveBeenCalled();
  });

  it('should deregister multiple stoppable objects', () => {
    const stoppable2 = new TestStoppable();
    scene.registerStoppables([stoppable, stoppable2]);
    scene.deregisterStoppables([stoppable, stoppable2]);
    scene.stop();
    expect(stoppable.stop).not.toHaveBeenCalled();
    expect(stoppable2.stop).not.toHaveBeenCalled();
  });
});
