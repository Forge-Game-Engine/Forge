import { createComponentId } from '@forge-game-engine/forge/ecs';

/**
 * Sweeps the `amount` of the entity's linear or radial mask between 0 and 1
 * and back, so the demo shows a fill moving without any input.
 */
export interface MaskPulseComponent {
  /** Full cycles per second. */
  speed: number;
}

export const maskPulseId = createComponentId<MaskPulseComponent>('maskPulse');
