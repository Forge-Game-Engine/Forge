import { Time } from '@forge-game-engine/forge/common';
import { EcsSystem } from '@forge-game-engine/forge/ecs';
import {
  StressTestSpawnerEcsComponent,
  stressTestSpawnerId,
} from './_stress-test-spawner.component';

/**
 * The FPS thresholds to watch for, checked in order from least to most
 * severe.
 */
const fpsThresholds = [100, 60, 30];

/**
 * Watches the frame rate as UI panels are spawned, logging the number of
 * panels that had been spawned when the frame rate first drops below each
 * threshold in `fpsThresholds`. Stops the spawner once the lowest threshold
 * has been reached.
 * @param time - The time instance used to read the current FPS.
 */
export const createFpsMonitorEcsSystem = (
  time: Time,
): EcsSystem<[StressTestSpawnerEcsComponent]> => {
  let nextThresholdIndex = 0;
  let startTimeInMilliseconds: number | null = null;

  return {
    query: [stressTestSpawnerId],
    update: (_world, { components: [spawners] }) => {
      for (const spawner of spawners) {
        if (nextThresholdIndex >= fpsThresholds.length) {
          continue;
        }

        startTimeInMilliseconds ??= time.rawTimeInMilliseconds;

        // `time.fps` is a count of frames over the last second, so it only
        // becomes meaningful once a full second of frames has been sampled.
        if (time.rawTimeInMilliseconds - startTimeInMilliseconds < 1000) {
          continue;
        }

        const threshold = fpsThresholds[nextThresholdIndex];

        if (time.fps >= threshold) {
          continue;
        }

        console.log(
          `FPS dropped below ${threshold}: ${spawner.spawnedCount} UI panels were on screen.`,
        );

        nextThresholdIndex += 1;

        if (nextThresholdIndex >= fpsThresholds.length) {
          spawner.isSpawning = false;
        }
      }
    },
  };
};
