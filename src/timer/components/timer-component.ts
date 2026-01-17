import { createComponentId } from '../../new-ecs/ecs-component.js';

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
 * ECS-style component interface for a timer component.
 */
export interface TimerEcsComponent {
  tasks: TimerTask[];
}

export const TimerId = createComponentId<TimerEcsComponent>('Timer');
