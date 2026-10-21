import { createComponentId, EcsWorld } from '@forge-game-engine/forge/ecs';

/**
 * Walks an entity over tilemap layers with the move input. The entity's
 * local position is in the layers' local space: it's a child of the bottom
 * layer, or of the map root the layers sit at the origin of.
 */
export interface WalkerEcsComponent {
  /**
   * The entities of the layers walked on, which share a layout. The walker
   * can enter a cell when at least one of them holds a tile there and every
   * tile there has a `walkable` property of `true`, so a wall in a layer
   * above the floor blocks it. Each tile's `speed` property scales `speed`.
   */
  layers: readonly number[];

  /** How fast the walker moves on a tile with a `speed` of `1`, in local units per second. */
  speed: number;
}

export const walkerId = createComponentId<WalkerEcsComponent>('Walker');

/**
 * Attaches a {@link WalkerEcsComponent} to `entity`.
 * @param world - The ECS world `entity` belongs to.
 * @param entity - The entity to walk, in the layers' local space.
 * @param options - The layers walked on and the walking speed.
 * @returns The attached component.
 */
export function addWalkerComponent(
  world: EcsWorld,
  entity: number,
  options: WalkerEcsComponent,
): WalkerEcsComponent {
  return world.addComponent(entity, walkerId, { ...options });
}
