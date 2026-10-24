import { Time } from '@forge-game-engine/forge/common';
import { EcsSystem, EcsWorld } from '@forge-game-engine/forge/ecs';
import { textId } from '@forge-game-engine/forge/text';
import {
  BodySpawnerEcsComponent,
  bodySpawnerId,
} from './_body-spawner.component';
import {
  FpsMonitorEcsComponent,
  fpsMonitorId,
  FpsThresholdReading,
} from './_fps-monitor.component';

// `time.fps` counts the frames over the last second. The display's frame
// rate is read after two seconds, so it counts the second second only: the
// first one includes the page still loading and warming up, which would
// make the display look slower than it is.
const measureDisplayAfterMilliseconds = 2000;

// A threshold this close to the display's refresh rate is skipped: the
// frame rate hovers around the refresh rate, so it would dip below the
// threshold with no bodies at all.
const displayCapRatio = 0.95;

function startSpawning(
  monitor: FpsMonitorEcsComponent,
  spawner: BodySpawnerEcsComponent,
  displayFps: number,
): void {
  monitor.displayFps = displayFps;

  console.log(`Display frame rate: ${displayFps} FPS.`);

  for (const reading of monitor.readings) {
    if (reading.threshold >= displayFps * displayCapRatio) {
      reading.state = 'displayCapped';

      console.log(
        `Skipping ${reading.threshold} FPS: the display only shows ${displayFps}.`,
      );
    }
  }

  spawner.isSpawning = monitor.readings.some(
    (reading) => reading.state === 'watching',
  );
}

function checkThreshold(
  monitor: FpsMonitorEcsComponent,
  spawner: BodySpawnerEcsComponent,
  fps: number,
): void {
  const reading = monitor.readings.find(
    (candidate) => candidate.state === 'watching',
  );

  if (!reading || fps >= reading.threshold) {
    return;
  }

  reading.state = 'reached';
  reading.bodyCount = spawner.spawnedCount;

  console.log(
    `FPS dropped below ${reading.threshold}: ${spawner.spawnedCount} bodies were in the scene.`,
  );

  spawner.isSpawning = monitor.readings.some(
    (candidate) => candidate.state === 'watching',
  );
}

function describeReading(reading: FpsThresholdReading): string {
  const label = `Below ${reading.threshold} FPS:`;

  if (reading.state === 'reached') {
    return `${label} ${reading.bodyCount} bodies`;
  }

  if (reading.state === 'displayCapped') {
    return `${label} display-capped`;
  }

  return `${label} -`;
}

function writeReadout(
  world: EcsWorld,
  monitor: FpsMonitorEcsComponent,
  spawner: BodySpawnerEcsComponent,
): void {
  const lines = [
    monitor.displayFps === null
      ? 'Display: measuring...'
      : `Display: ${monitor.displayFps} FPS`,
    `Bodies: ${spawner.spawnedCount}`,
    ...monitor.readings.map(describeReading),
  ];

  for (let i = 0; i < monitor.labels.length; i++) {
    // The text shaping system only re-shapes text that changed, so
    // writing the same line every frame costs nothing.
    world.getComponentRequired(monitor.labels[i], textId).text = lines[i];
  }
}

/**
 * Watches the frame rate as bodies spawn. It first measures the display's
 * frame rate with an empty scene and then starts the spawner. From then on
 * it records the body count when the frame rate first falls below each
 * threshold, logs it and shows it in the readout, and stops the spawner
 * once the last threshold is reached.
 * @param time - The time instance used to read the current FPS.
 */
export const createFpsMonitorEcsSystem = (
  time: Time,
): EcsSystem<[BodySpawnerEcsComponent, FpsMonitorEcsComponent]> => ({
  query: [bodySpawnerId, fpsMonitorId],
  update: (world, { components: [spawners, monitors] }) => {
    for (let i = 0; i < monitors.length; i++) {
      const spawner = spawners[i];
      const monitor = monitors[i];

      monitor.startTimeInMilliseconds ??= time.rawTimeInMilliseconds;

      const elapsed =
        time.rawTimeInMilliseconds - monitor.startTimeInMilliseconds;

      if (elapsed < measureDisplayAfterMilliseconds) {
        continue;
      }

      if (monitor.displayFps === null) {
        startSpawning(monitor, spawner, time.fps);
      } else {
        checkThreshold(monitor, spawner, time.fps);
      }

      writeReadout(world, monitor, spawner);
    }
  },
});
