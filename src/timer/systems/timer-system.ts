import { Time } from '../../common/index.js';
import { TimerEcsComponent, TimerId } from '../components/timer-component.js';

import { EcsSystem } from '../../new-ecs/ecs-system.js';

/**
 * Creates an ECS system to handle timers.
 */
export const createTimerEcsSystem = (
  time: Time,
): EcsSystem<[TimerEcsComponent]> => ({
  query: [TimerId],
  run: (result) => {
    const [timerComponent] = result.components;

    if (timerComponent.tasks.length === 0) {
      return;
    }

    // Iterate backwards to safely remove tasks as needed
    for (let i = timerComponent.tasks.length - 1; i >= 0; i--) {
      const task = timerComponent.tasks[i];
      task.elapsed += time.deltaTimeInMilliseconds;

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
  },
});
