import { GridCellRange } from '../../math/index.js';
import {
  tilemapChunkSize,
  TilemapLayerEcsComponent,
} from '../components/tilemap-layer-component.js';
import { emptyTile } from '../tiles/packed-tile.js';
import {
  assertCell,
  getCellIndex,
  getChunkKey,
  getSortedChunks,
  toChunkCoordinate,
} from './chunk-key.js';

/**
 * Reads one cell of a layer. Reading never creates a chunk.
 * @param layer - The layer.
 * @param column - The cell's column, which increases towards `+X`.
 * @param row - The cell's row, which increases towards `+Y`, down the
 * screen.
 * @returns The cell's packed tile, or `emptyTile`. Read its fields with
 * `unpackTile` and its data with `getTileData`.
 * @throws An error if `column` or `row` isn't a whole number from `-2^30`
 * to `2^30 - 1`.
 */
export function getTile(
  layer: TilemapLayerEcsComponent,
  column: number,
  row: number,
): number {
  assertCell('get the tile', column, row);

  const chunk = layer.chunks.get(
    getChunkKey(toChunkCoordinate(column), toChunkCoordinate(row)),
  );

  return chunk ? chunk.tiles[getCellIndex(column, row)] : emptyTile;
}

/**
 * Calls `callback` for every non-empty cell of a layer, chunk by chunk in
 * row-major order of their chunk coordinates, and row-major within each
 * chunk. Drawing cells in this order is back to front. The order doesn't
 * depend on the order the tiles were written in.
 * @param layer - The layer. `callback` must not change it.
 * @param callback - Called with each cell's column, row and packed tile.
 */
export function forEachTile(
  layer: TilemapLayerEcsComponent,
  callback: (column: number, row: number, tile: number) => void,
): void {
  for (const chunk of getSortedChunks(layer)) {
    const firstColumn = chunk.column * tilemapChunkSize;
    const firstRow = chunk.row * tilemapChunkSize;

    chunk.tiles.forEach((tile, index) => {
      if (tile === emptyTile) {
        return;
      }

      callback(
        firstColumn + (index % tilemapChunkSize),
        firstRow + Math.floor(index / tilemapChunkSize),
        tile,
      );
    });
  }
}

/**
 * Finds the smallest range of cells that holds every non-empty cell of a
 * layer, like Godot's `get_used_rect`. It scans every stored cell, so call
 * it for editor-style queries or to fit a camera to a map, not every frame.
 * @param layer - The layer.
 * @returns A new inclusive range of cells, or `null` if the layer is empty.
 */
export function getUsedRect(
  layer: TilemapLayerEcsComponent,
): GridCellRange | null {
  if (layer.chunks.size === 0) {
    return null;
  }

  const range: GridCellRange = {
    minColumn: Infinity,
    minRow: Infinity,
    maxColumn: -Infinity,
    maxRow: -Infinity,
  };

  forEachTile(layer, (column, row) => {
    range.minColumn = Math.min(range.minColumn, column);
    range.minRow = Math.min(range.minRow, row);
    range.maxColumn = Math.max(range.maxColumn, column);
    range.maxRow = Math.max(range.maxRow, row);
  });

  return range;
}
