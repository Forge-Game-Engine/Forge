import { createComponentId } from '../../ecs/ecs-component.js';
import { EcsWorld } from '../../ecs/ecs-world.js';

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
   * After each run of a repeating task, the timer system sets it to `interval`.
   */
  delay: number;

  /**
   * Elapsed time in milliseconds tracked by the timer system. Start a new
   * task at `0`. The timer system adds `time.deltaTimeInMilliseconds` to it on
   * every update, and sets it back to `0` after each run of a repeating task,
   * so time past the deadline isn't carried into the next run.
   */
  elapsed: number;

  /**
   * If true, this task will repeat periodically after the initial delay.
   * Only takes effect when `interval` is also set; without it, the task runs
   * once and is removed.
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
   * Counter tracking how many times this repeating task has been executed.
   * The timer system increments it after each run, treating an unset value
   * as `0`.
   */
  runsSoFar?: number;
}

/**
 * ECS-style component interface for a timer component.
 */
export interface TimerEcsComponent {
  /**
   * The entity's pending tasks. The timer system removes a task once it has
   * run for the last time. Tasks can be added and removed at any time.
   */
  tasks: TimerTask[];
}

export const TimerId = createComponentId<TimerEcsComponent>('Timer');

/**
 * Attaches a {@link TimerEcsComponent} to `entity`.
 * @param world - The ECS world `entity` belongs to.
 * @param entity - The entity to attach the component to.
 * @param options - Options for configuring the timer.
 * @returns The attached component, for further tuning or runtime changes.
 */
export function addTimerComponent(
  world: EcsWorld,
  entity: number,
  options: Partial<TimerEcsComponent> = {},
): TimerEcsComponent {
  // `tasks` defaults to a fresh array per call (rather than a shared
  // module-level default) since it's mutated in place by callers.
  const defaultTimerOptions: TimerEcsComponent = {
    tasks: [],
  };

  const component: TimerEcsComponent = {
    ...defaultTimerOptions,
    ...options,
  };

  return world.addComponent(entity, TimerId, component);
}
