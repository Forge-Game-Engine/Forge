import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TimerSystem } from './timer-system';
import { TimerComponent } from '../components/timer-component';
import { Entity, World } from '../../ecs';
import { Time } from '../../common';

describe('TimerSystem', () => {
  let time: Time;
  let timerSystem: TimerSystem;
  let world: World;
  let entity: Entity;
  let timerComponent: TimerComponent;

  beforeEach(() => {
    time = new Time();
    timerSystem = new TimerSystem(time);
    world = new World('test-world');
    timerComponent = new TimerComponent();
    entity = new Entity(world, [timerComponent]);
  });

  it('should not execute when tasks list is empty', () => {
    time.update(16);
    timerSystem.run(entity);

    expect(timerComponent.tasks.length).toBe(0);
  });

  it('should execute one-shot timer after delay', () => {
    const callback = vi.fn();
    timerComponent.addTask({
      callback,
      delay: 100,
      elapsed: 0,
    });

    // Before delay
    time.update(50);
    timerSystem.run(entity);
    expect(callback).not.toHaveBeenCalled();
    expect(timerComponent.tasks.length).toBe(1);

    // After delay
    time.update(100);
    timerSystem.run(entity);
    expect(callback).toHaveBeenCalledTimes(1);
    expect(timerComponent.tasks.length).toBe(0);
  });

  it('should track elapsed time correctly', () => {
    const callback = vi.fn();
    timerComponent.addTask({
      callback,
      delay: 100,
      elapsed: 0,
    });

    time.update(30);
    timerSystem.run(entity);
    expect(timerComponent.tasks[0].elapsed).toBe(30);

    time.update(60);
    timerSystem.run(entity);
    expect(timerComponent.tasks[0].elapsed).toBe(60);
  });

  it('should execute repeating timer multiple times', () => {
    const callback = vi.fn();
    timerComponent.addTask({
      callback,
      delay: 50,
      elapsed: 0,
      repeat: true,
      interval: 50,
      runsSoFar: 0,
    });

    // First execution
    time.update(60);
    timerSystem.run(entity);
    expect(callback).toHaveBeenCalledTimes(1);
    expect(timerComponent.tasks.length).toBe(1);
    expect(timerComponent.tasks[0].elapsed).toBe(0);
    expect(timerComponent.tasks[0].runsSoFar).toBe(1);

    // Second execution
    time.update(110);
    timerSystem.run(entity);
    expect(callback).toHaveBeenCalledTimes(2);
    expect(timerComponent.tasks.length).toBe(1);
    expect(timerComponent.tasks[0].runsSoFar).toBe(2);
  });

  it('should use interval for subsequent runs after first delay', () => {
    const callback = vi.fn();
    timerComponent.addTask({
      callback,
      delay: 100,
      elapsed: 0,
      repeat: true,
      interval: 50,
      runsSoFar: 0,
    });

    // First execution after initial delay
    time.update(110);
    timerSystem.run(entity);
    expect(callback).toHaveBeenCalledTimes(1);
    expect(timerComponent.tasks[0].delay).toBe(50); // Should now use interval

    // Second execution after interval
    time.update(160);
    timerSystem.run(entity);
    expect(callback).toHaveBeenCalledTimes(2);
  });

  it('should stop repeating timer after maxRuns', () => {
    const callback = vi.fn();
    timerComponent.addTask({
      callback,
      delay: 50,
      elapsed: 0,
      repeat: true,
      interval: 50,
      maxRuns: 3,
      runsSoFar: 0,
    });

    // Run 1
    time.update(60);
    timerSystem.run(entity);
    expect(callback).toHaveBeenCalledTimes(1);
    expect(timerComponent.tasks.length).toBe(1);

    // Run 2
    time.update(110);
    timerSystem.run(entity);
    expect(callback).toHaveBeenCalledTimes(2);
    expect(timerComponent.tasks.length).toBe(1);

    // Run 3 (final run)
    time.update(160);
    timerSystem.run(entity);
    expect(callback).toHaveBeenCalledTimes(3);
    expect(timerComponent.tasks.length).toBe(0); // Task removed
  });

  it('should handle multiple tasks on same entity', () => {
    const callback1 = vi.fn();
    const callback2 = vi.fn();
    const callback3 = vi.fn();

    timerComponent.addTask({
      callback: callback1,
      delay: 50,
      elapsed: 0,
    });

    timerComponent.addTask({
      callback: callback2,
      delay: 100,
      elapsed: 0,
    });

    timerComponent.addTask({
      callback: callback3,
      delay: 150,
      elapsed: 0,
    });

    // Execute first task
    time.update(60);
    timerSystem.run(entity);
    expect(callback1).toHaveBeenCalledTimes(1);
    expect(callback2).not.toHaveBeenCalled();
    expect(callback3).not.toHaveBeenCalled();
    expect(timerComponent.tasks.length).toBe(2);

    // Execute second task
    time.update(120);
    timerSystem.run(entity);
    expect(callback2).toHaveBeenCalledTimes(1);
    expect(callback3).not.toHaveBeenCalled();
    expect(timerComponent.tasks.length).toBe(1);

    // Execute third task
    time.update(180);
    timerSystem.run(entity);
    expect(callback3).toHaveBeenCalledTimes(1);
    expect(timerComponent.tasks.length).toBe(0);
  });

  it('should handle task execution when elapsed equals delay exactly', () => {
    const callback = vi.fn();
    timerComponent.addTask({
      callback,
      delay: 100,
      elapsed: 0,
    });

    time.update(100);
    timerSystem.run(entity);
    expect(callback).toHaveBeenCalledTimes(1);
    expect(timerComponent.tasks.length).toBe(0);
  });

  it('should accumulate elapsed time over multiple frames', () => {
    const callback = vi.fn();
    timerComponent.addTask({
      callback,
      delay: 100,
      elapsed: 0,
    });

    // Frame 1: 16ms
    time.update(16);
    timerSystem.run(entity);
    expect(callback).not.toHaveBeenCalled();
    expect(timerComponent.tasks[0].elapsed).toBe(16);

    // Frame 2: 33ms total
    time.update(33);
    timerSystem.run(entity);
    expect(callback).not.toHaveBeenCalled();
    expect(timerComponent.tasks[0].elapsed).toBe(33);

    // Frame 3: 101ms total (exceeds delay)
    time.update(101);
    timerSystem.run(entity);
    expect(callback).toHaveBeenCalledTimes(1);
    expect(timerComponent.tasks.length).toBe(0);
  });

  it('should handle repeating timer without maxRuns indefinitely', () => {
    const callback = vi.fn();
    timerComponent.addTask({
      callback,
      delay: 50,
      elapsed: 0,
      repeat: true,
      interval: 50,
      runsSoFar: 0,
    });

    // Run multiple times
    for (let i = 1; i <= 10; i++) {
      time.update(50 * i + 10);
      timerSystem.run(entity);
    }

    expect(callback).toHaveBeenCalledTimes(10);
    expect(timerComponent.tasks.length).toBe(1); // Still has the task
  });

  it('should properly reset elapsed time for repeating tasks', () => {
    const callback = vi.fn();
    timerComponent.addTask({
      callback,
      delay: 50,
      elapsed: 0,
      repeat: true,
      interval: 50,
      runsSoFar: 0,
    });

    // First run
    time.update(60);
    timerSystem.run(entity);
    expect(timerComponent.tasks[0].elapsed).toBe(0); // Reset after execution
    expect(callback).toHaveBeenCalledTimes(1);

    // Add more elapsed time
    time.update(90);
    timerSystem.run(entity);
    expect(timerComponent.tasks[0].elapsed).toBe(30); // Accumulated from reset
    expect(callback).toHaveBeenCalledTimes(1); // Not called yet

    // Second run
    time.update(120);
    timerSystem.run(entity);
    expect(timerComponent.tasks[0].elapsed).toBe(0); // Reset again
    expect(callback).toHaveBeenCalledTimes(2);
  });
});
