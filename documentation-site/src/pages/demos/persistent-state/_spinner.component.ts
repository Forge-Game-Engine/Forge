import { createComponentId } from '@forge-game-engine/forge/ecs';

/**
 * The square's settings, written from the persistent settings record when
 * the world is created and whenever the record changes.
 */
export interface SpinnerEcsComponent {
  size: number;
  spin: boolean;
  /** Radians per second while `spin` is on. */
  speed: number;
}

export const spinnerId = createComponentId<SpinnerEcsComponent>('spinner');
