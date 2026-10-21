import { createComponentId, EcsWorld } from '@forge-game-engine/forge/ecs';

/** Toggles a solid tile in the cell the mouse clicks. */
export interface TileToggleEcsComponent {
  /** The camera the mouse looks through. */
  camera: number;

  /** The layer entity whose cells are toggled. */
  layer: number;

  /** The packed tile a click places in an empty cell. */
  tile: number;

  /** An entity whose collider a placed tile mustn't overlap. */
  keepClear: number;
}

export const tileToggleId =
  createComponentId<TileToggleEcsComponent>('tile-toggle');

/**
 * Adds a tile toggle to an entity.
 * @param world - The world the entity belongs to.
 * @param entity - The entity to add it to.
 * @param toggle - The camera, the layer, the tile to place and the entity
 * to keep clear.
 * @returns The added component.
 */
export function addTileToggleComponent(
  world: EcsWorld,
  entity: number,
  toggle: TileToggleEcsComponent,
): TileToggleEcsComponent {
  world.addComponent(entity, tileToggleId, toggle);

  return toggle;
}
