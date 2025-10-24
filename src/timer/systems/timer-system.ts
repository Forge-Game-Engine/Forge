import { Entity, System } from '../../ecs/index.js';
import { Time } from '../../common/index.js';
import { TimerComponent } from '../components/timer-component.js';

export class TimerSystem extends System {
  private readonly _time: Time;

  constructor(time: Time) {
    super('timer', [TimerComponent.symbol]);
    this._time = time;
  }

  public run(entity: Entity): void {
    const timerComponent = entity.getComponentRequired<TimerComponent>(
      TimerComponent.symbol,
    );

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
