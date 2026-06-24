import { createComponentId } from '@forge-game-engine/forge/ecs';

/**
 * Per-entity data driving one row of the easing functions demo: which easing
 * function to apply, and the x-range its sprite sweeps back and forth
 * across.
 */
export interface EasingRowEcsComponent {
  easingFunction: (t: number) => number;
  minX: number;
  maxX: number;
}

export const easingRowId =
  createComponentId<EasingRowEcsComponent>('easingRow');
