import { createComponentId } from '@forge-game-engine/forge/ecs';

/** The on-screen readout of how much work sleeping saves. */
export interface SleepReadoutEcsComponent {
  /**
   * The label entities the readout is written to, one per line: the
   * sleeping bodies, the broad phase's pairs, then the pairs the narrow
   * phase tests.
   */
  labels: readonly number[];
}

export const sleepReadoutId =
  createComponentId<SleepReadoutEcsComponent>('sleepReadout');
