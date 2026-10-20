// Builds the vertices of one (chunk, tileset source) mesh. Not exported
// from the package.

import { Rect, Vector2 } from '../../math/index.js';
import {
  TilemapChunk,
  tilemapChunkSize,
} from '../components/tilemap-layer-component.js';
import { TileSet } from '../tile-set/tile-set.js';
import { getTileImageRect } from '../tiles/get-tile-image-rect.js';
import { emptyTile } from '../tiles/packed-tile.js';
import {
  getTileIndex,
  getTileSourceIndex,
  getTileTransformBits,
} from '../tiles/packed-tile-bits.js';
import {
  applyTileTransform,
  invertTileTransform,
} from '../tiles/tile-transform.js';
import { verticesPerTile } from './quad-indices.js';

/** Floats per vertex of `a_position`. */
export const positionSize = 2;

/** Floats per vertex of `a_texCoord`. */
export const texCoordSize = 2;

/** Floats per vertex of `a_texRect`. */
export const texRectSize = 4;

/**
 * The vertex arrays of one chunk mesh, one per attribute `tilemap.vert`
 * reads, each holding `verticesPerTile` vertices per tile.
 */
export interface TilemapVertexArrays {
  /** `a_position`: each quad corner, in the layer's local space. */
  positions: Float32Array;

  /** `a_texCoord`: where each corner samples the atlas, in UV. */
  texCoords: Float32Array;

  /** `a_texRect`: the tile's region, offset then size, on every corner. */
  texRects: Float32Array;
}

/**
 * Creates vertex arrays with room for `tileCount` tiles.
 * @param tileCount - The number of tiles.
 * @returns The arrays, zero-filled.
 */
export const createTilemapVertexArrays = (
  tileCount: number,
): TilemapVertexArrays => {
  const vertexCount = tileCount * verticesPerTile;

  return {
    positions: new Float32Array(vertexCount * positionSize),
    texCoords: new Float32Array(vertexCount * texCoordSize),
    texRects: new Float32Array(vertexCount * texRectSize),
  };
};

/**
 * The quad's corners in the drawn image's normalized coordinates (`(0, 0)`
 * top-left, `(1, 1)` bottom-right), in the order they're written: top-left,
 * top-right, bottom-right, bottom-left.
 */
const corners: readonly Vector2[] = [
  { x: 0, y: 0 },
  { x: 1, y: 0 },
  { x: 1, y: 1 },
  { x: 0, y: 1 },
];

// Reused by every call, so writing a chunk allocates only what
// `getTileImageRect` does.
const drawnMin: Vector2 = { x: 0, y: 0 };
const drawnMax: Vector2 = { x: 0, y: 0 };
const corner: Vector2 = { x: 0, y: 0 };
const sampled: Vector2 = { x: 0, y: 0 };

/**
 * Maps a normalized coordinate of the image onto the image's rect along one
 * axis. The rect's own edges are copied rather than interpolated, so tiles
 * that meet share bit-identical edge coordinates and no crack shows between
 * them.
 */
const lerpEdge = (min: number, max: number, t: number): number => {
  if (t === 0) {
    return min;
  }

  if (t === 1) {
    return max;
  }

  return min + t * (max - min);
};

/**
 * Writes one tile's quad at `quad`.
 * @param arrays - The arrays to write into.
 * @param quad - The quad's index in the arrays.
 * @param tileSet - The layer's tile set.
 * @param column - The cell's column.
 * @param row - The cell's row.
 * @param tile - The packed tile.
 */
const writeTile = (
  arrays: TilemapVertexArrays,
  quad: number,
  tileSet: TileSet,
  column: number,
  row: number,
  tile: number,
): void => {
  const image: Rect = getTileImageRect(tileSet, column, row, tile);
  const region =
    tileSet.sources[getTileSourceIndex(tile)].atlas.regions[getTileIndex(tile)];
  const bits = getTileTransformBits(tile);
  const { uvOffset, uvScale, trimOffset, trimScale } = region;

  // A trimmed region draws only its share of the image, moved by the
  // transform bits like the rest of the content: the rect the trimmed
  // frame lands on once transformed. Untrimmed, it's the whole image.
  applyTileTransform(bits, trimOffset, drawnMin);
  corner.x = trimOffset.x + trimScale.x;
  corner.y = trimOffset.y + trimScale.y;
  applyTileTransform(bits, corner, drawnMax);

  const minX = Math.min(drawnMin.x, drawnMax.x);
  const maxX = Math.max(drawnMin.x, drawnMax.x);
  const minY = Math.min(drawnMin.y, drawnMax.y);
  const maxY = Math.max(drawnMin.y, drawnMax.y);

  for (let i = 0; i < verticesPerTile; i++) {
    const vertex = quad * verticesPerTile + i;
    const unit = corners[i];

    corner.x = unit.x === 0 ? minX : maxX;
    corner.y = unit.y === 0 ? minY : maxY;

    arrays.positions[vertex * positionSize] = lerpEdge(
      image.min.x,
      image.max.x,
      corner.x,
    );
    arrays.positions[vertex * positionSize + 1] = lerpEdge(
      image.min.y,
      image.max.y,
      corner.y,
    );

    // The corner shows the content the bits moved there, so it samples the
    // untransformed frame where that content was.
    invertTileTransform(bits, corner, sampled);

    arrays.texCoords[vertex * texCoordSize] =
      uvOffset.x + ((sampled.x - trimOffset.x) / trimScale.x) * uvScale.x;
    arrays.texCoords[vertex * texCoordSize + 1] =
      uvOffset.y + ((sampled.y - trimOffset.y) / trimScale.y) * uvScale.y;

    const texRect = vertex * texRectSize;

    arrays.texRects[texRect] = uvOffset.x;
    arrays.texRects[texRect + 1] = uvOffset.y;
    arrays.texRects[texRect + 2] = uvScale.x;
    arrays.texRects[texRect + 3] = uvScale.y;
  }
};

/**
 * Counts a chunk's tiles from each source.
 * @param chunk - The chunk.
 * @param counts - Receives the count of each source, by source index. Must
 * hold at least as many entries as the tile set has sources; it's zeroed
 * first.
 */
export const countChunkTilesBySource = (
  chunk: TilemapChunk,
  counts: Uint16Array,
): void => {
  counts.fill(0);

  for (const tile of chunk.tiles) {
    if (tile !== emptyTile) {
      counts[getTileSourceIndex(tile)]++;
    }
  }
};

/**
 * Writes the quads of a chunk's tiles from one source, in row-major cell
 * order, which draws them back to front. Each quad is the tile's
 * `getTileImageRect` in the layer's local space (shrunk to the drawn part
 * of a trimmed region), with texture coordinates that apply the tile's
 * transform bits.
 * @param tileSet - The layer's tile set.
 * @param chunk - The chunk.
 * @param source - The index of the source whose tiles to write.
 * @param arrays - The arrays to write into, with room for every tile of
 * `source` in the chunk.
 * @returns The number of tiles written.
 */
export const writeChunkVertices = (
  tileSet: TileSet,
  chunk: TilemapChunk,
  source: number,
  arrays: TilemapVertexArrays,
): number => {
  const firstColumn = chunk.column * tilemapChunkSize;
  const firstRow = chunk.row * tilemapChunkSize;
  let quad = 0;

  for (let index = 0; index < chunk.tiles.length; index++) {
    const tile = chunk.tiles[index];

    if (tile === emptyTile || getTileSourceIndex(tile) !== source) {
      continue;
    }

    writeTile(
      arrays,
      quad,
      tileSet,
      firstColumn + (index % tilemapChunkSize),
      firstRow + Math.floor(index / tilemapChunkSize),
      tile,
    );
    quad++;
  }

  return quad;
};
