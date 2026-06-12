import { Time } from '@forge-game-engine/forge/common';
import { EcsSystem } from '@forge-game-engine/forge/ecs';
import {
  SpriteSpawnerEcsComponent,
  spriteSpawnerId,
} from './_sprite-spawner.component';

/**
 * The FPS thresholds to watch for, checked in order from least to most
 * severe.
 */
const fpsThresholds = [100, 60, 30];

/**
 * Watches the frame rate as sprites are spawned, logging the number of
 * sprites that had been spawned when the frame rate first drops below each
 * threshold in `fpsThresholds`. Stops the spawner once the lowest threshold
 * has been reached.
 * @param time - The time instance used to read the current FPS.
 */
export const createFpsMonitorEcsSystem = (
  time: Time,
): EcsSystem<[SpriteSpawnerEcsComponent]> => {
  let nextThresholdIndex = 0;
  let startTimeInMilliseconds: number | null = null;

  return {
    query: [spriteSpawnerId],
    run: (result) => {
      const [spawner] = result.components;

      if (nextThresholdIndex >= fpsThresholds.length) {
        return;
      }

      startTimeInMilliseconds ??= time.rawTimeInMilliseconds;

      // `time.fps` is a count of frames over the last second, so it only
      // becomes meaningful once a full second of frames has been sampled.
      // `time.timeInSeconds` can't be used for this: `Game.run` seeds it
      // with `performance.now()`, so it can already be well past 1 second
      // on the very first frame.
      if (time.rawTimeInMilliseconds - startTimeInMilliseconds < 1000) {
        return;
      }

      const threshold = fpsThresholds[nextThresholdIndex];

      if (time.fps >= threshold) {
        return;
      }

      console.log(
        `FPS dropped below ${threshold}: ${spawner.spawnedCount} sprites were on screen.`,
      );

      nextThresholdIndex += 1;

      if (nextThresholdIndex >= fpsThresholds.length) {
        spawner.isSpawning = false;
      }
    },
  };
};
