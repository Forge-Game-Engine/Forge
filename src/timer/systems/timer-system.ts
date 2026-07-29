import { Time } from '../../common/index.js';
import { TimerEcsComponent, TimerId } from '../components/timer-component.js';
import { EcsSystem } from '../../ecs/ecs-system.js';

/**
 * Creates an ECS system to handle timers.
 * @param time - The time instance used to advance each timer's elapsed time.
 */
export const createTimerEcsSystem = (
  time: Time,
): EcsSystem<[TimerEcsComponent]> => ({
  query: [TimerId],
  update: (_world, { components: [timerComponents] }) => {
    const deltaTime = time.deltaTimeInMilliseconds;

    for (let c = 0; c < timerComponents.length; c++) {
      const timerComponent = timerComponents[c];
      const tasks = timerComponent.tasks;

      if (tasks.length === 0) {
        continue;
      }

      for (let i = tasks.length - 1; i >= 0; i--) {
        const task = tasks[i];
        task.elapsed += deltaTime;

        if (task.elapsed >= task.delay) {
          task.callback();

          if (task.repeat && task.interval !== undefined) {
            task.runsSoFar = (task.runsSoFar ?? 0) + 1;

            if (task.maxRuns !== undefined && task.runsSoFar >= task.maxRuns) {
              tasks.splice(i, 1);
            } else {
              task.elapsed = 0;
              task.delay = task.interval;
            }
          } else {
            tasks.splice(i, 1);
          }
        }
      }
    }
  },
});
