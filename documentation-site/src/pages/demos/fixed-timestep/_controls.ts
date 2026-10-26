import { Time } from '@forge-game-engine/forge/common';

/** The fixed step rates the page offers, in steps per second. */
export const stepRates = [10, 30, 60, 120] as const;

export type StepRate = (typeof stepRates)[number];

/** The engine's default: `Time` starts at 60 fixed steps per second. */
export const defaultStepRate: StepRate = 60;

/**
 * Sets how many fixed steps run per second of game time. Physics systems
 * read the new step size from the next fixed step on.
 * @param time - The time the world's fixed steps are taken from.
 * @param stepsPerSecond - The new fixed step rate.
 */
export function setStepRate(time: Time, stepsPerSecond: number): void {
  time.fixedDeltaTimeInMilliseconds = 1000 / stepsPerSecond;
}

/**
 * Blocks the main thread, the way a long garbage collection or a slow
 * asset decode would. The next frame's delta time includes the stall, so
 * that frame runs as many fixed steps as it takes to catch up, up to the
 * `250` millisecond frame cap.
 * @param milliseconds - How long to block for.
 */
export function simulateHitch(milliseconds = 200): void {
  const end = performance.now() + milliseconds;

  while (performance.now() < end) {
    // Busy-wait: nothing else runs on the main thread until `end`.
  }
}
