import { createComponentId } from '@forge-game-engine/forge/ecs';

/**
 * A component is plain data attached to an entity. This one marks the
 * entity the player moves with the keyboard, and says how fast it goes.
 */
export interface PlayerEcsComponent {
  /** How far the player moves each second, in world units. */
  speed: number;
}

/** The key the world stores every `PlayerEcsComponent` under. */
export const playerId = createComponentId<PlayerEcsComponent>('player');
