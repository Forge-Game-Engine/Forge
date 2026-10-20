// Where a cell is stored: its chunk, the chunk's key in the layer's map and
// the cell's index in the chunk. Not exported from the package.

import {
  TilemapChunk,
  tilemapChunkSize,
  TilemapLayerEcsComponent,
} from '../components/tilemap-layer-component.js';

/** The smallest cell coordinate a layer stores. */
export const minCellCoordinate = -(2 ** 30);

/** The largest cell coordinate a layer stores. */
export const maxCellCoordinate = 2 ** 30 - 1;

// Chunk coordinates run from -2^25 to 2^25 - 1. Offsetting them by 2^25
// makes them 0 to 2^26 - 1, so a key packs both into one safe integer
// below 2^52, with the row as the high part: sorting keys numerically sorts
// chunks row-major.
const chunkCoordinateOffset = 2 ** 25;
const chunkKeyStride = 2 ** 26;

/** A chunk's internal type, whose fields only the cell functions write. */
export type WritableTilemapChunk = {
  -readonly [K in keyof TilemapChunk]: TilemapChunk[K];
};

/** A layer's internal type, whose fields only the cell functions write. */
export type WritableTilemapLayer = {
  -readonly [K in keyof TilemapLayerEcsComponent]: TilemapLayerEcsComponent[K];
};

/**
 * The same layer, as the cell functions write it.
 * @param layer - The layer.
 * @returns `layer`.
 */
export const asWritableLayer = (
  layer: TilemapLayerEcsComponent,
): WritableTilemapLayer => layer;

/**
 * The same chunk, as the cell functions write it.
 * @param chunk - The chunk.
 * @returns `chunk`.
 */
export const asWritableChunk = (chunk: TilemapChunk): WritableTilemapChunk =>
  chunk;

/**
 * Whether a cell coordinate is one a layer stores.
 * @param value - The coordinate.
 * @returns `true` for a whole number from `-2^30` to `2^30 - 1`.
 */
export const isCellCoordinate = (value: number): boolean =>
  Number.isInteger(value) &&
  value >= minCellCoordinate &&
  value <= maxCellCoordinate;

/**
 * Throws if a cell isn't one a layer stores.
 * @param action - What was being done, for the message (e.g. `'set a tile'`).
 * @param column - The cell's column.
 * @param row - The cell's row.
 * @throws An error if `column` or `row` isn't a whole number from `-2^30`
 * to `2^30 - 1`.
 */
export const assertCell = (
  action: string,
  column: number,
  row: number,
): void => {
  if (isCellCoordinate(column) && isCellCoordinate(row)) {
    return;
  }

  throw new Error(
    `Unable to ${action} at (${column}, ${row}): a cell's column and row must be whole numbers from ${minCellCoordinate} to ${maxCellCoordinate}.`,
  );
};

/**
 * The chunk coordinate a cell coordinate is in.
 * @param cell - A valid cell coordinate.
 * @returns The chunk coordinate, floored, so `-1` is in chunk `-1`.
 */
export const toChunkCoordinate = (cell: number): number =>
  Math.floor(cell / tilemapChunkSize);

/**
 * The key of a chunk in a layer's `chunks`.
 * @param chunkColumn - The chunk's column.
 * @param chunkRow - The chunk's row.
 * @returns The key.
 */
export const getChunkKey = (chunkColumn: number, chunkRow: number): number =>
  (chunkRow + chunkCoordinateOffset) * chunkKeyStride +
  (chunkColumn + chunkCoordinateOffset);

/**
 * The index of a cell in its chunk's `tiles`.
 * @param column - A valid cell column.
 * @param row - A valid cell row.
 * @returns The index, row-major within the chunk.
 */
export const getCellIndex = (column: number, row: number): number =>
  (row - toChunkCoordinate(row) * tilemapChunkSize) * tilemapChunkSize +
  (column - toChunkCoordinate(column) * tilemapChunkSize);

/**
 * A layer's chunks in row-major order of their chunk coordinates, the order
 * in which drawing them is back to front.
 * @param layer - The layer.
 * @returns A new array of the layer's chunks.
 */
export const getSortedChunks = (
  layer: TilemapLayerEcsComponent,
): TilemapChunk[] =>
  [...layer.chunks.entries()]
    .sort(([a], [b]) => a - b)
    .map(([, chunk]) => chunk);
