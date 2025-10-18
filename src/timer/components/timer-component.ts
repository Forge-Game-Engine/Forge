import type { Component } from '../../ecs';

export interface TimerTask {
  callback: () => void;
  delay: number; // ms until first run for one-shot, or initial delay before first run for periodic
  elapsed: number; // elapsed time tracked by the system
  repeat?: boolean; // true if this task should repeat periodically
  interval?: number; // time between repeated calls if repeat is true
  maxRuns?: number; // optional limit to how many times a periodic task is executed
  runsSoFar?: number; // how many times this task has executed so far
}

export class TimerComponent implements Component {
  public name: symbol;
  public tasks: TimerTask[];

  public static readonly symbol = Symbol('Timer');

  constructor(tasks: TimerTask[] = []) {
    this.name = TimerComponent.symbol;
    this.tasks = tasks;
  }

  public addTask(task: TimerTask): void {
    // Initialize defaults
    task.elapsed = 0;
    task.runsSoFar = task.runsSoFar ?? 0;
    this.tasks.push(task);
  }
}
