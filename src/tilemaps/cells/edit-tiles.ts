import { GridCellRange } from '../../math/index.js';
import {
  TilemapChunk,
  tilemapChunkSize,
  TilemapLayerEcsComponent,
} from '../components/tilemap-layer-component.js';
import { describeTileProblem } from '../tile-set/describe-tile-problem.js';
import { TileSet } from '../tile-set/tile-set.js';
import { emptyTile } from '../tiles/packed-tile.js';
import {
  assertCell,
  asWritableChunk,
  asWritableLayer,
  getCellIndex,
  getChunkKey,
  getSortedChunks,
  toChunkCoordinate,
  WritableTilemapChunk,
  WritableTilemapLayer,
} from './chunk-key.js';

const createChunk = (
  chunkColumn: number,
  chunkRow: number,
): WritableTilemapChunk => ({
  column: chunkColumn,
  row: chunkRow,
  tiles: new Uint32Array(tilemapChunkSize * tilemapChunkSize),
  tileCount: 0,
  changedAt: 0,
});

/**
 * Writes `tile` into the cells of `area` that are inside `chunk`, keeping
 * its `tileCount` in step.
 * @returns Whether any cell changed.
 */
const writeCellsInChunk = (
  chunk: WritableTilemapChunk,
  area: GridCellRange,
  tile: number,
): boolean => {
  const chunkMinColumn = chunk.column * tilemapChunkSize;
  const chunkMinRow = chunk.row * tilemapChunkSize;
  const minColumn = Math.max(area.minColumn, chunkMinColumn);
  const maxColumn = Math.min(
    area.maxColumn,
    chunkMinColumn + tilemapChunkSize - 1,
  );
  const minRow = Math.max(area.minRow, chunkMinRow);
  const maxRow = Math.min(area.maxRow, chunkMinRow + tilemapChunkSize - 1);
  const countChange = tile === emptyTile ? -1 : 1;
  let changed = false;

  for (let row = minRow; row <= maxRow; row++) {
    for (let column = minColumn; column <= maxColumn; column++) {
      const index = getCellIndex(column, row);
      const previous = chunk.tiles[index];

      if (previous === tile) {
        continue;
      }

      changed = true;

      // Only a cell that goes from empty to a tile, or from a tile to
      // empty, changes the count; replacing one tile with another doesn't.
      if (previous === emptyTile || tile === emptyTile) {
        chunk.tileCount += countChange;
      }

      chunk.tiles[index] = tile;
    }
  }

  return changed;
};

/**
 * Writes `tile` into the part of `area` inside one chunk, creating the
 * chunk if it needs one and removing it if it ends up empty.
 * @returns Whether any cell changed.
 */
const writeChunkArea = (
  layer: WritableTilemapLayer,
  chunkColumn: number,
  chunkRow: number,
  area: GridCellRange,
  tile: number,
  stamp: number,
): boolean => {
  const key = getChunkKey(chunkColumn, chunkRow);
  const existing = layer.chunks.get(key);

  if (!existing && tile === emptyTile) {
    return false;
  }

  const chunk = existing
    ? asWritableChunk(existing)
    : createChunk(chunkColumn, chunkRow);

  if (!writeCellsInChunk(chunk, area, tile)) {
    return false;
  }

  chunk.changedAt = stamp;

  if (chunk.tileCount === 0) {
    layer.chunks.delete(key);
  } else if (!existing) {
    layer.chunks.set(key, chunk);
  }

  return true;
};

/**
 * Writes `tile` into every cell of a non-empty, validated area, and moves
 * the layer to its next version if any cell changed.
 */
const writeArea = (
  layer: TilemapLayerEcsComponent,
  area: GridCellRange,
  tile: number,
): void => {
  const writableLayer = asWritableLayer(layer);
  const stamp = layer.version + 1;
  const lastChunkRow = toChunkCoordinate(area.maxRow);
  const lastChunkColumn = toChunkCoordinate(area.maxColumn);
  let changed = false;

  for (
    let chunkRow = toChunkCoordinate(area.minRow);
    chunkRow <= lastChunkRow;
    chunkRow++
  ) {
    for (
      let chunkColumn = toChunkCoordinate(area.minColumn);
      chunkColumn <= lastChunkColumn;
      chunkColumn++
    ) {
      changed =
        writeChunkArea(
          writableLayer,
          chunkColumn,
          chunkRow,
          area,
          tile,
          stamp,
        ) || changed;
    }
  }

  if (changed) {
    writableLayer.version = stamp;
  }
};

const assertTileFits = (
  layer: TilemapLayerEcsComponent,
  tile: number,
  action: string,
): void => {
  const problem = describeTileProblem(layer.tileSet, tile);

  if (problem) {
    throw new Error(`Unable to ${action}: ${problem}`);
  }
};

/**
 * Writes one cell of a layer. If the cell changes, the layer's `version`
 * goes up by one and the cell's chunk is stamped with it; writing the tile
 * a cell already holds changes nothing. Writing a tile into a cell with no
 * chunk creates the chunk, and emptying a chunk's last cell removes it.
 * @param layer - The layer.
 * @param column - The cell's column, which increases towards `+X`.
 * @param row - The cell's row, which increases towards `+Y`, down the
 * screen.
 * @param tile - The packed tile, from `packTile`, or `emptyTile` to clear
 * the cell.
 * @throws An error, without changing the layer, if `column` or `row` isn't
 * a whole number from `-2^30` to `2^30 - 1`, or `tile` is malformed or
 * names a source or tile index the layer's tile set doesn't have.
 */
export function setTile(
  layer: TilemapLayerEcsComponent,
  column: number,
  row: number,
  tile: number,
): void {
  assertCell('set the tile', column, row);
  assertTileFits(layer, tile, `set the tile at (${column}, ${row})`);
  writeArea(
    layer,
    { minColumn: column, minRow: row, maxColumn: column, maxRow: row },
    tile,
  );
}

/**
 * Empties one cell of a layer, the same as setting it to `emptyTile`.
 * @param layer - The layer.
 * @param column - The cell's column.
 * @param row - The cell's row.
 * @throws An error if `column` or `row` isn't a whole number from `-2^30`
 * to `2^30 - 1`.
 */
export function clearTile(
  layer: TilemapLayerEcsComponent,
  column: number,
  row: number,
): void {
  assertCell('clear the tile', column, row);
  writeArea(
    layer,
    { minColumn: column, minRow: row, maxColumn: column, maxRow: row },
    emptyTile,
  );
}

/**
 * Writes one tile into a rectangle of cells, `columns` wide and `rows`
 * tall, starting at `(column, row)`. The whole fill is one change: the
 * layer's `version` goes up by one at most, and every chunk it changed is
 * stamped with the new value. Filling with `emptyTile` clears the cells
 * and removes the chunks it empties.
 * @param layer - The layer.
 * @param column - The column of the rectangle's left edge.
 * @param row - The row of the rectangle's top edge.
 * @param columns - How many columns to fill, `0` or more.
 * @param rows - How many rows to fill, `0` or more.
 * @param tile - The packed tile, or `emptyTile`.
 * @throws An error, without changing the layer, if a cell of the rectangle
 * is outside `-2^30` to `2^30 - 1`, `column`, `row`, `columns` or `rows`
 * isn't a whole number, `columns` or `rows` is negative, or `tile` is
 * malformed or names a source or tile index the layer's tile set doesn't
 * have.
 */
export function fillTiles(
  layer: TilemapLayerEcsComponent,
  column: number,
  row: number,
  columns: number,
  rows: number,
  tile: number,
): void {
  assertCell('fill tiles', column, row);

  if (
    !Number.isInteger(columns) ||
    !Number.isInteger(rows) ||
    columns < 0 ||
    rows < 0
  ) {
    throw new Error(
      `Unable to fill tiles at (${column}, ${row}): the size (${columns} x ${rows}) must be whole numbers of 0 or more.`,
    );
  }

  assertTileFits(layer, tile, `fill tiles at (${column}, ${row})`);

  if (columns === 0 || rows === 0) {
    return;
  }

  const maxColumn = column + columns - 1;
  const maxRow = row + rows - 1;

  assertCell('fill tiles', maxColumn, maxRow);
  writeArea(layer, { minColumn: column, minRow: row, maxColumn, maxRow }, tile);
}

/**
 * Empties every cell of a layer and removes every chunk. The layer's
 * `version` goes up by one if it held any tile.
 * @param layer - The layer.
 */
export function clearTiles(layer: TilemapLayerEcsComponent): void {
  if (layer.chunks.size === 0) {
    return;
  }

  const writableLayer = asWritableLayer(layer);

  writableLayer.chunks.clear();
  writableLayer.version++;
}

/**
 * Replaces a layer's tile set, such as a seasonal one with the same tiles
 * drawn differently. Its layout may differ too. Every stored tile is
 * checked against the new tile set first. Every chunk may look different
 * afterwards, so the layer's `version` goes up by one and every chunk is
 * stamped with it. Setting the tile set the layer already has changes
 * nothing.
 * @param layer - The layer.
 * @param tileSet - The new tile set.
 * @throws An error, without changing the layer, if a stored tile names a
 * source or tile index the new tile set doesn't have.
 */
export function setTileSet(
  layer: TilemapLayerEcsComponent,
  tileSet: TileSet,
): void {
  if (tileSet === layer.tileSet) {
    return;
  }

  const chunks: TilemapChunk[] = getSortedChunks(layer);

  for (const chunk of chunks) {
    chunk.tiles.forEach((tile, index) => {
      const problem = describeTileProblem(tileSet, tile);

      if (!problem) {
        return;
      }

      const column =
        chunk.column * tilemapChunkSize + (index % tilemapChunkSize);
      const row =
        chunk.row * tilemapChunkSize + Math.floor(index / tilemapChunkSize);

      throw new Error(
        `Unable to set the tile set of a tilemap layer: the tile at (${column}, ${row}) isn't in it: ${problem}`,
      );
    });
  }

  const writableLayer = asWritableLayer(layer);
  const stamp = layer.version + 1;

  writableLayer.tileSet = tileSet;

  for (const chunk of chunks) {
    asWritableChunk(chunk).changedAt = stamp;
  }

  writableLayer.version = stamp;
}
