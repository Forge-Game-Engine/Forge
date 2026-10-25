import { createComponentId } from '@forge-game-engine/forge/ecs';

/**
 * What the FPS monitor has seen for one threshold:
 * - `'watching'` until the frame rate first falls below it,
 * - `'reached'` once it has, with the body count at that moment,
 * - `'displayCapped'` when the display's own refresh rate is at or near the
 *   threshold, so the frame rate can never rise far enough above it for the
 *   drop to mean anything.
 */
export interface FpsThresholdReading {
  readonly threshold: number;
  state: 'watching' | 'reached' | 'displayCapped';
  bodyCount: number;
}

/**
 * Records the body count when the frame rate first falls below each
 * threshold. Lives on the spawner entity, whose body count it reads.
 */
export interface FpsMonitorEcsComponent {
  /** One reading per threshold, from the highest frame rate to the lowest. */
  readings: FpsThresholdReading[];

  /** When the monitor first ran, or `null` before that. */
  startTimeInMilliseconds: number | null;

  /**
   * The frame rate with an empty scene, before any bodies spawn: the
   * display's refresh rate on most machines. `null` until it's measured.
   */
  displayFps: number | null;

  /**
   * The label entities the readout is written to, one per line: the display
   * frame rate, the body count, then one per reading.
   */
  labels: readonly number[];
}

export const fpsMonitorId =
  createComponentId<FpsMonitorEcsComponent>('fpsMonitor');
