import { localToWorldPoint } from '../../common/transforms/local-to-world-point.js';
import { worldToLocalPoint } from '../../common/transforms/world-to-local-point.js';
import { EcsWorld } from '../../ecs/ecs-world.js';
import { GridCell, Vector2 } from '../../math/index.js';
import { assertCell } from '../cells/chunk-key.js';
import {
  TilemapLayerEcsComponent,
  tilemapLayerId,
} from '../components/tilemap-layer-component.js';

/**
 * Finds the center of a cell's footprint, in the layer's local space,
 * through its tile set's layout.
 * @param layer - The layer.
 * @param column - The cell's column, which increases towards `+X`.
 * @param row - The cell's row, which increases towards `+Y`, down the
 * screen.
 * @returns A new `Vector2` holding the center, in layer-local space.
 * @throws An error if `column` or `row` isn't a whole number from `-2^30`
 * to `2^30 - 1`.
 */
export function cellToLocal(
  layer: TilemapLayerEcsComponent,
  column: number,
  row: number,
): Vector2 {
  assertCell('find the center of the cell', column, row);

  return layer.tileSet.layout.getCellCenter(column, row);
}

/**
 * Finds the cell of a layer that contains a point in the layer's local
 * space, through its tile set's layout. The cell is floored, so negative
 * points work, and a point on an edge is in the one cell that owns it (see
 * `GridLayout`).
 * @param layer - The layer.
 * @param point - The point, in layer-local space.
 * @returns The cell containing the point.
 * @throws An error if the point isn't finite.
 */
export function localToCell(
  layer: TilemapLayerEcsComponent,
  point: Vector2,
): GridCell {
  return layer.tileSet.layout.localToCell(point);
}

const getLayer = (
  world: EcsWorld,
  entity: number,
  action: string,
): TilemapLayerEcsComponent => {
  const layer = world.getComponent(entity, tilemapLayerId);

  if (!layer) {
    throw new Error(
      `Unable to ${action}: entity ${entity} has no TilemapLayerEcsComponent.`,
    );
  }

  return layer;
};

/**
 * Finds the center of a cell's footprint in world space, through the layer
 * entity's world position, rotation and scale (see `localToWorldPoint`).
 * @param world - The ECS world the layer entity belongs to.
 * @param entity - The entity with the `TilemapLayerEcsComponent` and a
 * `PositionEcsComponent`.
 * @param column - The cell's column.
 * @param row - The cell's row.
 * @returns A new `Vector2` holding the center, in world space.
 * @throws An error if the entity has no `TilemapLayerEcsComponent` or
 * `PositionEcsComponent`, or `column` or `row` isn't a whole number from
 * `-2^30` to `2^30 - 1`.
 */
export function cellToWorld(
  world: EcsWorld,
  entity: number,
  column: number,
  row: number,
): Vector2 {
  const layer = getLayer(world, entity, 'find the cell in world space');

  return localToWorldPoint(world, entity, cellToLocal(layer, column, row));
}

/**
 * Finds the cell of a layer that contains a point in world space, through
 * the layer entity's world position, rotation and scale (see
 * `worldToLocalPoint`). This is how the mouse picks a cell: map the pointer
 * to world space with a `CameraView`, then to a cell with this.
 * @param world - The ECS world the layer entity belongs to.
 * @param entity - The entity with the `TilemapLayerEcsComponent` and a
 * `PositionEcsComponent`.
 * @param point - The point, in world space.
 * @returns The cell containing the point.
 * @throws An error if the entity has no `TilemapLayerEcsComponent` or
 * `PositionEcsComponent`, its world scale is `0` on an axis, or the point
 * isn't finite.
 */
export function worldToCell(
  world: EcsWorld,
  entity: number,
  point: Vector2,
): GridCell {
  const layer = getLayer(world, entity, 'find the cell at a world point');

  return localToCell(layer, worldToLocalPoint(world, entity, point));
}
