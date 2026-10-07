import { createComponentId } from '@forge-game-engine/forge/ecs';

/**
 * Scrolls the entity upwards, wrapping back down after `wrapHeight`, so the
 * list inside the mask keeps moving.
 */
export interface ScrollComponent {
  /** World units per second. */
  speed: number;

  /** How far the entity scrolls before wrapping back. */
  wrapHeight: number;
}

export const scrollId = createComponentId<ScrollComponent>('scroll');
