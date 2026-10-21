import { createComponentId, EcsWorld } from '@forge-game-engine/forge/ecs';

/**
 * Highlights the cell of a layer under the mouse, and toggles a tile in the
 * cell the mouse clicks.
 */
export interface CellCursorEcsComponent {
  /** The camera the mouse looks through. */
  camera: number;

  /** The layer entity whose cells are picked and toggled. */
  layer: number;

  /** The root entity whose sprite highlights the picked cell. */
  highlight: number;

  /** The packed tile a click places in an empty cell. */
  tile: number;

  /** An entity whose collider a placed tile mustn't overlap. */
  keepClear: number;

  /** How many columns the map has: cells outside it aren't picked. */
  columns: number;

  /** How many rows the map has: cells outside it aren't picked. */
  rows: number;
}

export const cellCursorId =
  createComponentId<CellCursorEcsComponent>('cell-cursor');

/**
 * Adds a cell cursor to an entity.
 * @param world - The world the entity belongs to.
 * @param entity - The entity to add it to.
 * @param cursor - The camera, the layer, the highlight, the tile to place,
 * the entity to keep clear and the map's size.
 * @returns The added component.
 */
export function addCellCursorComponent(
  world: EcsWorld,
  entity: number,
  cursor: CellCursorEcsComponent,
): CellCursorEcsComponent {
  world.addComponent(entity, cellCursorId, cursor);

  return cursor;
}
