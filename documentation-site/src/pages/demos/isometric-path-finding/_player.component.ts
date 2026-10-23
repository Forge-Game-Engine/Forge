import { createComponentId, EcsWorld } from '@forge-game-engine/forge/ecs';

/** A body walked with the keyboard. */
export interface PlayerEcsComponent {
  /** How fast the player walks, in world units a second. */
  speed: number;
}

export const playerId = createComponentId<PlayerEcsComponent>('player');

/**
 * Marks an entity as the player.
 * @param world - The world the entity belongs to.
 * @param entity - The player's entity.
 * @param player - The player's speed.
 * @returns The added component.
 */
export function addPlayerComponent(
  world: EcsWorld,
  entity: number,
  player: PlayerEcsComponent,
): PlayerEcsComponent {
  world.addComponent(entity, playerId, player);

  return player;
}
