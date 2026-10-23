import { EcsSystem, EcsWorld } from '@forge-game-engine/forge/ecs';
import {
  MouseInputSource,
  TriggerAction,
} from '@forge-game-engine/forge/input';
import { Vector2 } from '@forge-game-engine/forge/math';
import { colliderId } from '@forge-game-engine/forge/physics';
import {
  getCameraView,
  RenderContext,
} from '@forge-game-engine/forge/rendering';
import {
  cellToWorld,
  clearTile,
  emptyTile,
  getTile,
  setTile,
  TilemapLayerEcsComponent,
  tilemapLayerId,
  worldToCell,
} from '@forge-game-engine/forge/tilemaps';
import { CellCursorEcsComponent, cellCursorId } from './_cell-cursor.component';

/** The inputs the cell cursor reads. */
export interface CellCursorInputs {
  mouse: MouseInputSource;

  /** Toggles the tile in the cell under the mouse. */
  toggleInput: TriggerAction;
}

/**
 * Whether the collider of an entity overlaps the bounds of a cell's
 * footprint. The layer is unrotated and unscaled, so the footprint's
 * bounds are the layout's cell size around the cell's center.
 */
const overlapsCell = (
  world: EcsWorld,
  entity: number,
  layer: TilemapLayerEcsComponent,
  center: Vector2,
): boolean => {
  const collider = world.getComponent(entity, colliderId);

  if (!collider) {
    return false;
  }

  const halfWidth = layer.tileSet.layout.cellWidth / 2;
  const halfHeight = layer.tileSet.layout.cellHeight / 2;
  const { min, max } = collider.aabb;

  return (
    min.x < center.x + halfWidth &&
    max.x > center.x - halfWidth &&
    min.y < center.y + halfHeight &&
    max.y > center.y - halfHeight
  );
};

const updateCursor = (
  world: EcsWorld,
  renderContext: RenderContext,
  inputs: CellCursorInputs,
  cursor: CellCursorEcsComponent,
): void => {
  const layer = world.getComponent(cursor.layer, tilemapLayerId);

  if (!layer) {
    return;
  }

  // The mouse, in CSS pixels over the canvas, to a world point through the
  // camera, then to the diamond of the layer that holds it.
  const worldPoint = getCameraView(
    world,
    cursor.camera,
    renderContext,
  ).viewportToWorld(inputs.mouse.position);
  const { column, row } = worldToCell(world, cursor.layer, worldPoint);
  const { minColumn, minRow, maxColumn, maxRow } = cursor.cells;
  const isInMap =
    column >= minColumn &&
    column <= maxColumn &&
    row >= minRow &&
    row <= maxRow;

  cursor.hoveredCell = isInMap ? { column, row } : null;

  if (!isInMap || !inputs.toggleInput.isTriggered) {
    return;
  }

  if (getTile(layer, column, row) !== emptyTile) {
    clearTile(layer, column, row);

    return;
  }

  const center = cellToWorld(world, cursor.layer, column, row);

  if (!overlapsCell(world, cursor.keepClear, layer, center)) {
    setTile(layer, column, row, cursor.tile);
  }
};

/**
 * Creates the system that picks the cell of a layer under the mouse, the
 * goal of the path, and toggles the clicked cell: a click on a tile clears
 * it, and a click on an empty cell places the cursor's tile, unless it would
 * overlap the collider of the entity to keep clear.
 *
 * Register it before `createTilemapColliderEcsSystem`, so a toggled tile's
 * collider is rebuilt, and the grid baked from it, on the tick it's
 * clicked.
 * @param renderContext - The render context whose canvas the mouse is over.
 * @param inputs - The mouse and the toggle action.
 * @returns The ECS system.
 */
export const createCellCursorEcsSystem = (
  renderContext: RenderContext,
  inputs: CellCursorInputs,
): EcsSystem<[CellCursorEcsComponent]> => ({
  query: [cellCursorId],
  update: (world, { components: [cursors] }) => {
    for (const cursor of cursors) {
      updateCursor(world, renderContext, inputs, cursor);
    }
  },
});
