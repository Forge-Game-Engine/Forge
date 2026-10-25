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

  /**
   * Set by the jump-input system when the jump action is pressed. The
   * player-move system clears it in its next physics step, jumping if the
   * player stands on the ground. A press lasts one frame, which can run no
   * physics step or several, so this carries it to exactly one step.
   */
  jumpRequested: boolean;
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
  player: Omit<PlayerEcsComponent, 'jumpRequested'>,
): PlayerEcsComponent {
  const component: PlayerEcsComponent = { ...player, jumpRequested: false };

  world.addComponent(entity, playerId, component);

  return component;
}
