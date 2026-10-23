import { worldToLocalPoint } from '../../common/transforms/world-to-local-point.js';
import { EcsWorld } from '../../ecs/ecs-world.js';
import type { NavigationGrid } from '../../navigation/grid/navigation-grid.js';
import { isCellCoordinate } from '../cells/chunk-key.js';
import { getTile } from '../cells/read-tiles.js';
import { tilemapLayerId } from '../components/tilemap-layer-component.js';
import { getTileData } from '../tile-set/tile-set.js';
import { emptyTile } from '../tiles/packed-tile.js';

/**
 * Sets the cost of every cell of a navigation grid from a tile layer: the
 * cell takes the `navigationCost` of the layer's tile under the cell's
 * centre. A cell over an empty cell, or over a tile whose `navigationCost`
 * is `null`, keeps its cost. Walkability never changes, so a blocked cell
 * keeps blocking and takes the cost it will have if it's opened. Blocking
 * comes from the layer's collider, which `markGridFromColliders` bakes.
 *
 * The centre is mapped into the layer through the layer entity's world
 * position, rotation and scale, as `worldToCell` maps it, so the grid and
 * the layer needn't share a layout, cell size, origin or cells. A grid laid
 * over the layer (the layer's layout, its origin at the layer's world
 * position) gets each cell's own tile. `markGridFromColliders` ignores
 * scale, as physics does, so on a scaled layer the costs follow the drawn
 * tiles and the walls don't: the two bakes only agree on an unscaled
 * layer.
 *
 * It's a bake step: run it when the level loads, after one `world.update()`
 * has placed the layer, and again after the layer's tiles change, not every
 * frame. Since `null` leaves costs alone, reset them first with
 * `grid.fillCost(grid.cells, 1)` when re-applying, and apply several layers
 * in order: a later layer's costs replace an earlier one's.
 * `grid.version` increases once if any cost changed.
 * @param world - The ECS world the layer entity belongs to.
 * @param layerEntity - The entity with the `TilemapLayerEcsComponent` and a
 * `PositionEcsComponent`.
 * @param grid - The grid whose costs to set.
 * @throws An error if the entity has no `TilemapLayerEcsComponent` or no
 * `PositionEcsComponent`, or its world scale is `0` on an axis.
 */
export function applyTilemapNavigationCosts(
  world: EcsWorld,
  layerEntity: number,
  grid: NavigationGrid,
): void {
  const layer = world.getComponent(layerEntity, tilemapLayerId);

  if (!layer) {
    throw new Error(
      `Unable to apply a tile layer's navigation costs: entity ${layerEntity} has no TilemapLayerEcsComponent.`,
    );
  }

  const { layout } = layer.tileSet;
  const costs = new Float32Array(grid.nodeCount);

  for (let node = 0; node < grid.nodeCount; node++) {
    const { column, row } = grid.nodeToCell(node);

    costs[node] = grid.getCost(column, row);

    const cell = layout.localToCell(
      worldToLocalPoint(world, layerEntity, grid.cellToWorld(column, row)),
    );

    // A centre mapped further out than a layer stores cells is over no
    // tile.
    if (!isCellCoordinate(cell.column) || !isCellCoordinate(cell.row)) {
      continue;
    }

    const tile = getTile(layer, cell.column, cell.row);

    if (tile === emptyTile) {
      continue;
    }

    const { navigationCost } = getTileData(layer.tileSet, tile);

    if (navigationCost !== null) {
      costs[node] = navigationCost;
    }
  }

  grid.setCosts(costs);
}
