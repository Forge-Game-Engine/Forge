import { createComponentId } from '@forge-game-engine/forge/ecs';

/**
 * Marks the basket the player moves to catch stars.
 */
export interface PlayerEcsComponent {
  speed: number;
  halfWidth: number;
  minX: number;
  maxX: number;
}

export const playerId = createComponentId<PlayerEcsComponent>('player');
