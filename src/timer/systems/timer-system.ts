import { Time } from '../../common/index.js';
import { TimerEcsComponent, TimerId } from '../components/timer-component.js';
import { EcsSystem } from '../../ecs/ecs-system.js';

type TimerTask = TimerEcsComponent['tasks'][number];

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

    for (let i = 0; i < timerComponents.length; i++) {
      advanceTimerTasks(timerComponents[i].tasks, deltaTime);
    }
  },
});

const advanceTimerTasks = (tasks: TimerTask[], deltaTime: number) => {
  for (let i = tasks.length - 1; i >= 0; i--) {
    const task = tasks[i];

    if (!advanceTimerTask(task, deltaTime)) {
      continue;
    }

    task.callback();

    if (shouldRemoveTimerTask(task)) {
      tasks.splice(i, 1);
    } else {
      resetRepeatingTimerTask(task);
    }
  }
};

const advanceTimerTask = (task: TimerTask, deltaTime: number) => {
  task.elapsed += deltaTime;

  return task.elapsed >= task.delay;
};

const shouldRemoveTimerTask = (task: TimerTask) => {
  if (!task.repeat || task.interval === undefined) {
    return true;
  }

  task.runsSoFar = (task.runsSoFar ?? 0) + 1;

  return task.maxRuns !== undefined && task.runsSoFar >= task.maxRuns;
};

const resetRepeatingTimerTask = (task: TimerTask) => {
  task.elapsed = 0;
  task.delay = task.interval ?? 0;
};
