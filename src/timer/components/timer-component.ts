import { Component } from '../../ecs/index.js';

/**
 * Represents a single timer task that can execute a callback after a delay.
 */
export interface TimerTask {
  /**
   * The function to execute when the timer fires.
   */
  callback: () => void;

  /**
   * Milliseconds until first execution for one-shot timers, or initial delay before first run for repeating timers.
   */
  delay: number;

  /**
   * Elapsed time in milliseconds tracked by the TimerSystem.
   */
  elapsed: number;

  /**
   * If true, this task will repeat periodically after the initial delay.
   */
  repeat?: boolean;

  /**
   * Milliseconds between repeated executions (only used when repeat is true).
   */
  interval?: number;

  /**
   * Optional limit on how many times a repeating task can execute before being removed.
   */
  maxRuns?: number;

  /**
   * Counter tracking how many times this task has been executed.
   */
  runsSoFar?: number;
}

/**
 * Component that holds a list of timer tasks for an entity.
 * Timer tasks can be one-shot (execute once after a delay) or repeating (execute periodically).
 *
 * @example
 * ```typescript
 * // Create entity with timer component
 * const entity = world.buildAndAddEntity([new TimerComponent()]);
 * const timer = entity.getComponentRequired(TimerComponent);
 *
 * // Add a one-shot timer (executes once after 1 second)
 * timer.addTask({
 *   callback: () => console.log('Timer fired!'),
 *   delay: 1000,
 *   elapsed: 0,
 * });
 *
 * // Add a repeating timer (executes every 500ms)
 * timer.addTask({
 *   callback: () => console.log('Tick!'),
 *   delay: 500,
 *   elapsed: 0,
 *   repeat: true,
 *   interval: 500,
 *   runsSoFar: 0,
 * });
 * ```
 */
export class TimerComponent extends Component {
  /**
   * Array of timer tasks to be processed by the TimerSystem.
   */
  public tasks: TimerTask[];

  /**
   * Creates a new TimerComponent.
   * @param tasks - Optional initial array of timer tasks.
   */
  constructor(tasks: TimerTask[] = []) {
    super();

    this.tasks = tasks;
  }

  /**
   * Adds a new timer task to the component.
   * Automatically initializes elapsed to 0 and runsSoFar to 0 if not already set.
   * @param task - The timer task to add.
   */
  public addTask(task: TimerTask): void {
    // Initialize defaults
    task.elapsed = 0;
    task.runsSoFar = task.runsSoFar ?? 0;
    this.tasks.push(task);
  }
}
