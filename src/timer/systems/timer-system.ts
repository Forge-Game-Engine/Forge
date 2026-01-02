import { Entity, System } from '../../ecs/index.js';
import { Time } from '../../common/index.js';
import { TimerComponent } from '../components/timer-component.js';

/**
 * System that processes timer tasks on entities with TimerComponent.
 * Updates elapsed time and executes callbacks when delays are reached.
 *
 * Supports both one-shot timers (execute once after a delay) and repeating timers
 * (execute periodically with an optional maximum run count).
 *
 * @example
 * ```typescript
 * const world = new World('game');
 * const timerSystem = new TimerSystem(world.time);
 * world.addSystem(timerSystem);
 *
 * const entity = world.buildAndAddEntity([new TimerComponent()]);
 * const timer = entity.getComponentRequired(TimerComponent);
 *
 * // One-shot timer
 * timer.addTask({
 *   callback: () => console.log('Fired!'),
 *   delay: 1000,
 *   elapsed: 0,
 * });
 *
 * // Repeating timer with maxRuns
 * timer.addTask({
 *   callback: () => console.log('Tick!'),
 *   delay: 500,
 *   elapsed: 0,
 *   repeat: true,
 *   interval: 500,
 *   maxRuns: 5,
 *   runsSoFar: 0,
 * });
 * ```
 */
export class TimerSystem extends System {
  private readonly _time: Time;

  /**
   * Creates an instance of TimerSystem.
   * @param time - The Time instance used to track delta time.
   */
  constructor(time: Time) {
    super([TimerComponent], 'timer');
    this._time = time;
  }

  /**
   * Processes all timer tasks on an entity.
   * Updates elapsed time and executes callbacks when their delays are reached.
   * One-shot tasks are removed after execution.
   * Repeating tasks reset their elapsed time and continue until maxRuns is reached (if specified).
   *
   * @param entity - The entity with TimerComponent to process.
   */
  public run(entity: Entity): void {
    const timerComponent = entity.getComponentRequired(TimerComponent);

    if (timerComponent.tasks.length === 0) {
      return;
    }

    const deltaTime = this._time.deltaTimeInMilliseconds;

    // Iterate backwards to safely remove tasks as needed
    for (let i = timerComponent.tasks.length - 1; i >= 0; i--) {
      const task = timerComponent.tasks[i];
      task.elapsed += deltaTime;

      if (task.elapsed >= task.delay) {
        task.callback();

        if (task.repeat && task.interval !== undefined) {
          // Periodic task
          task.runsSoFar!++;

          if (task.maxRuns !== undefined && task.runsSoFar! >= task.maxRuns) {
            // Remove if we have run it the max times
            timerComponent.tasks.splice(i, 1);
          } else {
            // Reset elapsed for the next interval
            task.elapsed = 0;
            // Now that the first run is done, subsequent intervals
            // are determined by 'interval' rather than 'delay'.
            task.delay = task.interval;
          }
        } else {
          // One-shot task, remove after execution
          timerComponent.tasks.splice(i, 1);
        }
      }
    }
  }
}
