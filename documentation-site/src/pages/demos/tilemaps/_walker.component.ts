import { createComponentId, EcsWorld } from '@forge-game-engine/forge/ecs';

/**
 * Walks an entity over a tilemap layer with the move input. The entity is a
 * child of the layer, so its local position is in the layer's local space.
 */
export interface WalkerEcsComponent {
  /**
   * The entity of the layer walked on. Its tiles' `walkable` property says
   * whether the walker can enter a cell, and their `speed` property scales
   * `speed`.
   */
  ground: number;

  /** How fast the walker moves on a tile with a `speed` of `1`, in local units per second. */
  speed: number;
}

export const walkerId = createComponentId<WalkerEcsComponent>('Walker');

/**
 * Attaches a {@link WalkerEcsComponent} to `entity`.
 * @param world - The ECS world `entity` belongs to.
 * @param entity - The entity to walk; a child of the `ground` layer.
 * @param options - The layer walked on and the walking speed.
 * @returns The attached component.
 */
export function addWalkerComponent(
  world: EcsWorld,
  entity: number,
  options: WalkerEcsComponent,
): WalkerEcsComponent {
  return world.addComponent(entity, walkerId, { ...options });
}
