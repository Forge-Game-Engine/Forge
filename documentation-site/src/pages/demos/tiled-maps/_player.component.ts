import { createComponentId, EcsWorld } from '@forge-game-engine/forge/ecs';
import { Vector2 } from '@forge-game-engine/forge/math';

/** A body the player walks and jumps with. */
export interface PlayerEcsComponent {
  /** The horizontal speed while a walk key is held, in world units a second. */
  walkSpeed: number;

  /** The upward speed a jump starts with, in world units a second. */
  jumpSpeed: number;

  /** Where the player starts, and where it's put back after falling in. */
  spawn: Vector2;

  /** The layer entity the player stands on. */
  ground: number;

  /** The layer entity that sends the player back to `spawn` when touched. */
  water: number;

  /** The Y past which the player has fallen out of the map. */
  fallLimit: number;
}

export const playerId = createComponentId<PlayerEcsComponent>('player');

/**
 * Marks an entity as the player.
 * @param world - The world the entity belongs to.
 * @param entity - The player's entity.
 * @param player - The player's speeds, spawn point and layers.
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
