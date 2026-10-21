// Builds the vertices of one (chunk, tileset source) mesh, and the quads
// every tilemap mesh is made of. Not exported from the package.

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
  withoutTransformBits,
} from '../tiles/packed-tile-bits.js';
import { getFrameIndexAt } from '../tiles/tile-animation-timing.js';
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
 * Writes `value` at `index` of `array`.
 * @returns Whether the value there was different.
 */
const writeChanged = (
  array: Float32Array,
  index: number,
  value: number,
): boolean => {
  const before = array[index];

  array[index] = value;

  return array[index] !== before;
};

/**
 * Writes one tile's quad at `quad`. The quad sits where the placed tile's
 * image does (`getTileImageRect`), and shows the region of
 * `frameTileIndex`, turned by the placed tile's transform bits.
 * @param arrays - The arrays to write into.
 * @param quad - The quad's index in the arrays.
 * @param tileSet - The layer's tile set.
 * @param column - The cell's column.
 * @param row - The cell's row.
 * @param tile - The placed tile.
 * @param frameTileIndex - The index, in the placed tile's source, of the
 * tile whose image to show: the placed tile's own, or its current
 * animation frame's.
 * @returns Whether any corner's position changed.
 */
export const writeTile = (
  arrays: TilemapVertexArrays,
  quad: number,
  tileSet: TileSet,
  column: number,
  row: number,
  tile: number,
  frameTileIndex: number,
): boolean => {
  const image: Rect = getTileImageRect(tileSet, column, row, tile);
  const region =
    tileSet.sources[getTileSourceIndex(tile)].atlas.regions[frameTileIndex];
  const bits = getTileTransformBits(tile);
  let moved = false;
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

    // A frame's region can be trimmed differently from the last one shown,
    // which moves the corners of the drawn part.
    moved =
      writeChanged(
        arrays.positions,
        vertex * positionSize,
        lerpEdge(image.min.x, image.max.x, corner.x),
      ) || moved;
    moved =
      writeChanged(
        arrays.positions,
        vertex * positionSize + 1,
        lerpEdge(image.min.y, image.max.y, corner.y),
      ) || moved;

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

  return moved;
};

/**
 * The index of the tile a cell shows at a time: the placed tile's own, or
 * its animation's frame at that time.
 * @param tileSet - The layer's tile set.
 * @param tile - The placed tile.
 * @param timeInMilliseconds - The time whose animation frame to show.
 * @returns The index, in the placed tile's source, of the tile to show.
 */
export const getFrameTileIndex = (
  tileSet: TileSet,
  tile: number,
  timeInMilliseconds: number,
): number => {
  const { animation } =
    tileSet.sources[getTileSourceIndex(tile)].tiles[getTileIndex(tile)];

  if (animation === null) {
    return getTileIndex(tile);
  }

  return animation[getFrameIndexAt(animation, timeInMilliseconds)].tile;
};

/**
 * Which quads of a chunk mesh show animated tiles, so a frame change
 * rewrites only those.
 */
export interface TilemapAnimatedQuads {
  /**
   * The quad index, in the mesh, of each tile with an animation, in the
   * order the mesh writes them (row-major cell order).
   */
  animatedQuads: Uint16Array;

  /**
   * The index, in the chunk's `tiles`, of the cell each of `animatedQuads`
   * draws, in the same order.
   */
  animatedCells: Uint16Array;

  /**
   * The distinct animation keys among the mesh's tiles: each animated tile
   * packed without its transform bits.
   */
  animatedTiles: readonly number[];
}

/** What {@link writeChunkVertices} wrote. */
export interface WrittenChunkVertices extends TilemapAnimatedQuads {
  /** The number of tiles (quads) written. */
  tileCount: number;
}

// Shared by every mesh without animated tiles. Empty, so nothing can write
// to them.
const noQuads = new Uint16Array(0);
const noTiles: readonly number[] = Object.freeze([]);

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
 * transform bits. An animated tile shows its frame at
 * `timeInMilliseconds`.
 * @param tileSet - The layer's tile set.
 * @param chunk - The chunk.
 * @param source - The index of the source whose tiles to write.
 * @param arrays - The arrays to write into, with room for every tile of
 * `source` in the chunk.
 * @param timeInMilliseconds - The time whose animation frames to show.
 * @returns The number of tiles written, and which of them are animated.
 */
export const writeChunkVertices = (
  tileSet: TileSet,
  chunk: TilemapChunk,
  source: number,
  arrays: TilemapVertexArrays,
  timeInMilliseconds: number,
): WrittenChunkVertices => {
  const firstColumn = chunk.column * tilemapChunkSize;
  const firstRow = chunk.row * tilemapChunkSize;
  const { tiles } = tileSet.sources[source];
  const animatedQuads: number[] = [];
  const animatedCells: number[] = [];
  const animatedTiles = new Set<number>();
  let quad = 0;

  for (let index = 0; index < chunk.tiles.length; index++) {
    const tile = chunk.tiles[index];

    if (tile === emptyTile || getTileSourceIndex(tile) !== source) {
      continue;
    }

    if (tiles[getTileIndex(tile)].animation !== null) {
      animatedQuads.push(quad);
      animatedCells.push(index);
      animatedTiles.add(withoutTransformBits(tile));
    }

    writeTile(
      arrays,
      quad,
      tileSet,
      firstColumn + (index % tilemapChunkSize),
      firstRow + Math.floor(index / tilemapChunkSize),
      tile,
      getFrameTileIndex(tileSet, tile, timeInMilliseconds),
    );
    quad++;
  }

  if (animatedQuads.length === 0) {
    return {
      tileCount: quad,
      animatedQuads: noQuads,
      animatedCells: noQuads,
      animatedTiles: noTiles,
    };
  }

  return {
    tileCount: quad,
    animatedQuads: Uint16Array.from(animatedQuads),
    animatedCells: Uint16Array.from(animatedCells),
    animatedTiles: [...animatedTiles],
  };
};

/**
 * Rewrites the animated quads of a chunk mesh whose tile's frame changed,
 * leaving every other quad as it is. The mesh must have been written by
 * {@link writeChunkVertices} from the chunk as it is now.
 * @param tileSet - The layer's tile set, the one the mesh was written
 * with.
 * @param chunk - The chunk the mesh draws.
 * @param arrays - The mesh's arrays.
 * @param animated - The mesh's animated quads.
 * @param changedFrames - The tile index each animation key whose frame
 * changed now shows, by key. Keys the mesh doesn't hold are ignored.
 * @returns Whether any corner's position changed, which happens when a
 * frame's region is trimmed differently from the last one shown.
 */
export const writeAnimatedQuads = (
  tileSet: TileSet,
  chunk: TilemapChunk,
  arrays: TilemapVertexArrays,
  animated: TilemapAnimatedQuads,
  changedFrames: ReadonlyMap<number, number>,
): boolean => {
  const firstColumn = chunk.column * tilemapChunkSize;
  const firstRow = chunk.row * tilemapChunkSize;
  let moved = false;

  for (let i = 0; i < animated.animatedQuads.length; i++) {
    const index = animated.animatedCells[i];
    const tile = chunk.tiles[index];
    const frameTileIndex = changedFrames.get(withoutTransformBits(tile));

    if (frameTileIndex === undefined) {
      continue;
    }

    moved =
      writeTile(
        arrays,
        animated.animatedQuads[i],
        tileSet,
        firstColumn + (index % tilemapChunkSize),
        firstRow + Math.floor(index / tilemapChunkSize),
        tile,
        frameTileIndex,
      ) || moved;
  }

  return moved;
};
