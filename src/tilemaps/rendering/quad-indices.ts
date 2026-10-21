// The index pattern every tilemap geometry draws from. Not exported from
// the package.

import { tilemapChunkSize } from '../components/tilemap-layer-component.js';

/** The vertices of one tile's quad: top-left, top-right, bottom-right, bottom-left. */
export const verticesPerTile = 4;

/** The indices of one tile's quad: two triangles. */
export const indicesPerTile = 6;

const maxTilesPerChunk = tilemapChunkSize * tilemapChunkSize;

/** The most tiles whose vertices 16-bit indices can reach. */
const maxTilesWith16BitIndices = 65_536 / verticesPerTile;

/**
 * Fills `indices` with the quad pattern: tile `i`'s two triangles are
 * `4i + (0, 1, 2)` and `4i + (0, 2, 3)`.
 */
const fillQuadIndices = <TIndices extends Uint16Array | Uint32Array>(
  indices: TIndices,
): TIndices => {
  const tileCount = indices.length / indicesPerTile;

  for (let tile = 0; tile < tileCount; tile++) {
    const vertex = tile * verticesPerTile;
    const index = tile * indicesPerTile;

    indices[index] = vertex;
    indices[index + 1] = vertex + 1;
    indices[index + 2] = vertex + 2;
    indices[index + 3] = vertex;
    indices[index + 4] = vertex + 2;
    indices[index + 5] = vertex + 3;
  }

  return indices;
};

/**
 * The indices of a full chunk's quads. The pattern doesn't depend on the
 * tiles, so every chunk geometry draws a `subarray` of this one array. It's
 * never written, so geometries can keep a reference to it (to upload it
 * again after a lost context is restored). A full chunk is 4,096 vertices,
 * inside 16-bit indices.
 */
export const quadIndices: Uint16Array = fillQuadIndices(
  new Uint16Array(maxTilesPerChunk * indicesPerTile),
);

/**
 * The indices that draw the first `tileCount` quads of a chunk.
 * @param tileCount - The number of tiles, at most a full chunk's.
 * @returns A view of {@link quadIndices}.
 */
export const getQuadIndices = (tileCount: number): Uint16Array =>
  quadIndices.subarray(0, tileCount * indicesPerTile);

/**
 * Creates the quad pattern for `capacity` tiles, for a geometry that can
 * hold more tiles than a chunk: 16-bit while every vertex fits in them
 * (16,384 tiles), else 32-bit.
 * @param capacity - The number of tiles.
 * @returns A new array, owned by the caller.
 */
export const createQuadIndices = (
  capacity: number,
): Uint16Array | Uint32Array =>
  capacity <= maxTilesWith16BitIndices
    ? fillQuadIndices(new Uint16Array(capacity * indicesPerTile))
    : fillQuadIndices(new Uint32Array(capacity * indicesPerTile));
