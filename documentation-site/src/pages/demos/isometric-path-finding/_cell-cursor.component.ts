import { createComponentId, EcsWorld } from '@forge-game-engine/forge/ecs';
import { GridCell } from '@forge-game-engine/forge/math';

/**
 * Picks the cell of a layer under the mouse, and toggles a tile in the cell
 * the mouse clicks.
 */
export interface CellCursorEcsComponent {
  /** The camera the mouse looks through. */
  camera: number;

  /** The layer entity whose cells are picked and toggled. */
  layer: number;

  /** The packed tile a click places in an empty cell. */
  tile: number;

  /** An entity whose collider a placed tile mustn't overlap. */
  keepClear: number;

  /** How many columns the map has: cells outside it aren't picked. */
  columns: number;

  /** How many rows the map has: cells outside it aren't picked. */
  rows: number;

  /** The cell under the mouse, or `null` when the mouse is off the map. */
  hoveredCell: GridCell | null;
}

export const cellCursorId = createComponentId<CellCursorEcsComponent>(
  'path-finding-cell-cursor',
);

/**
 * Adds a cell cursor to an entity, with no cell picked yet.
 * @param world - The world the entity belongs to.
 * @param entity - The entity to add it to.
 * @param cursor - The camera, the layer, the tile to place, the entity to
 * keep clear and the map's size.
 * @returns The added component.
 */
export function addCellCursorComponent(
  world: EcsWorld,
  entity: number,
  cursor: Omit<CellCursorEcsComponent, 'hoveredCell'>,
): CellCursorEcsComponent {
  return world.addComponent(entity, cellCursorId, {
    ...cursor,
    hoveredCell: null,
  });
}
