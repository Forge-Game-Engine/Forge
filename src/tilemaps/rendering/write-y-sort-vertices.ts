// Builds the vertices of one tileset source's tiles in a y-sorted layer,
// grouped into sort rows. Not exported from the package.

import type { GeometrySectionOptions } from '../../rendering/geometry/geometry.js';
import { getTile } from '../cells/read-tiles.js';
import {
  tilemapChunkSize,
  TilemapLayerEcsComponent,
} from '../components/tilemap-layer-component.js';
import { TileSet } from '../tile-set/tile-set.js';
import { emptyTile } from '../tiles/packed-tile.js';
import {
  getTileIndex,
  getTileSourceIndex,
  withoutTransformBits,
} from '../tiles/packed-tile-bits.js';
import { indicesPerTile } from './quad-indices.js';
import {
  getFrameTileIndex,
  TilemapVertexArrays,
  writeTile,
} from './write-chunk-vertices.js';

/**
 * One source's cells in a layer, in drawing order: by ascending sort Y,
 * then row, then column. Entry `i` of each array is the `i`th cell.
 */
export interface YSortCells {
  /** The number of cells. */
  readonly count: number;

  /** Each cell's column. */
  readonly columns: Int32Array;

  /** Each cell's row. */
  readonly rows: Int32Array;

  /** Each cell's placed tile. */
  readonly tiles: Uint32Array;

  /**
   * Each cell's sort Y: its center's Y (`layout.getCellCenter`) plus its
   * placed tile's `ySortOrigin`, in the layer's local units.
   */
  readonly sortYs: Float64Array;

  /** The keys of the chunks that hold at least one of the cells. */
  readonly chunkKeys: ReadonlySet<number>;
}

/**
 * Collects a layer's cells that hold a tile of one source, with their sort
 * Y, in the order a y-sorted layer draws them: by ascending sort Y, then
 * row, then column. Cells with the same sort Y form one sort row. In an
 * isometric layout, the cells with the same `column + row` share one.
 * @param layer - The layer.
 * @param source - The index of the source whose cells to collect.
 * @returns The cells.
 */
export const collectYSortCells = (
  layer: TilemapLayerEcsComponent,
  source: number,
): YSortCells => {
  const { layout, sources } = layer.tileSet;
  const { tiles: sourceTiles } = sources[source];
  let count = 0;

  for (const chunk of layer.chunks.values()) {
    for (const tile of chunk.tiles) {
      if (tile !== emptyTile && getTileSourceIndex(tile) === source) {
        count++;
      }
    }
  }

  const columns = new Int32Array(count);
  const rows = new Int32Array(count);
  const tiles = new Uint32Array(count);
  const sortYs = new Float64Array(count);
  const chunkKeys = new Set<number>();
  let cell = 0;

  for (const [key, chunk] of layer.chunks) {
    const firstColumn = chunk.column * tilemapChunkSize;
    const firstRow = chunk.row * tilemapChunkSize;

    for (let index = 0; index < chunk.tiles.length; index++) {
      const tile = chunk.tiles[index];

      if (tile === emptyTile || getTileSourceIndex(tile) !== source) {
        continue;
      }

      const column = firstColumn + (index % tilemapChunkSize);
      const row = firstRow + Math.floor(index / tilemapChunkSize);

      columns[cell] = column;
      rows[cell] = row;
      tiles[cell] = tile;
      sortYs[cell] =
        layout.getCellCenter(column, row).y +
        sourceTiles[getTileIndex(tile)].ySortOrigin;
      chunkKeys.add(key);
      cell++;
    }
  }

  const order = Array.from({ length: count }, (_, i) => i).sort(
    (a, b) =>
      sortYs[a] - sortYs[b] || rows[a] - rows[b] || columns[a] - columns[b],
  );

  return {
    count,
    columns: Int32Array.from(order, (i) => columns[i]),
    rows: Int32Array.from(order, (i) => rows[i]),
    tiles: Uint32Array.from(order, (i) => tiles[i]),
    sortYs: Float64Array.from(order, (i) => sortYs[i]),
    chunkKeys,
  };
};

/** Which quads of a y-sort mesh show animated tiles. */
export interface TilemapYSortAnimatedQuads {
  /**
   * The quad index, in the mesh, of each tile with an animation, in the
   * order the mesh writes them.
   */
  animatedQuads: Uint32Array;

  /** The column and row of the cell each of `animatedQuads` draws. */
  animatedCells: Int32Array;

  /**
   * The distinct animation keys among the mesh's tiles: each animated tile
   * packed without its transform bits.
   */
  animatedTiles: readonly number[];
}

/** What {@link writeYSortVertices} wrote. */
export interface WrittenYSortVertices extends TilemapYSortAnimatedQuads {
  /** The sort Y of each sort row, ascending. */
  sortYs: number[];

  /** Each sort row's range of the indices, in the same order. */
  sections: GeometrySectionOptions[];
}

// Shared by every mesh without animated tiles. Empty, so nothing can write
// to them.
const noQuads = new Uint32Array(0);
const noCells = new Int32Array(0);
const noTiles: readonly number[] = Object.freeze([]);

/**
 * Writes the quads of a source's cells in the order they're collected in,
 * through the same `writeTile` as chunk meshes, and groups them into one
 * section per sort row: a run of cells with the same sort Y. An animated
 * tile shows its frame at `timeInMilliseconds`.
 * @param tileSet - The layer's tile set.
 * @param cells - The source's cells, from {@link collectYSortCells}.
 * @param arrays - The arrays to write into, with room for every cell.
 * @param timeInMilliseconds - The time whose animation frames to show.
 * @returns The rows' sort Ys and sections, and which quads are animated.
 */
export const writeYSortVertices = (
  tileSet: TileSet,
  cells: YSortCells,
  arrays: TilemapVertexArrays,
  timeInMilliseconds: number,
): WrittenYSortVertices => {
  const sortYs: number[] = [];
  const sections: GeometrySectionOptions[] = [];
  const animatedQuads: number[] = [];
  const animatedCells: number[] = [];
  const animatedTiles = new Set<number>();

  for (let quad = 0; quad < cells.count; quad++) {
    const sortY = cells.sortYs[quad];
    const column = cells.columns[quad];
    const row = cells.rows[quad];
    const tile = cells.tiles[quad];

    if (sortYs.length === 0 || sortYs[sortYs.length - 1] !== sortY) {
      sortYs.push(sortY);
      sections.push({ start: quad * indicesPerTile, count: 0 });
    }

    sections[sections.length - 1].count += indicesPerTile;

    if (
      tileSet.sources[getTileSourceIndex(tile)].tiles[getTileIndex(tile)]
        .animation !== null
    ) {
      animatedQuads.push(quad);
      animatedCells.push(column, row);
      animatedTiles.add(withoutTransformBits(tile));
    }

    writeTile(
      arrays,
      quad,
      tileSet,
      column,
      row,
      tile,
      getFrameTileIndex(tileSet, tile, timeInMilliseconds),
    );
  }

  if (animatedQuads.length === 0) {
    return {
      sortYs,
      sections,
      animatedQuads: noQuads,
      animatedCells: noCells,
      animatedTiles: noTiles,
    };
  }

  return {
    sortYs,
    sections,
    animatedQuads: Uint32Array.from(animatedQuads),
    animatedCells: Int32Array.from(animatedCells),
    animatedTiles: [...animatedTiles],
  };
};

/**
 * Rewrites the animated quads of a y-sort mesh whose tile's frame changed,
 * leaving every other quad as it is. The mesh must have been written by
 * {@link writeYSortVertices} from the layer's cells as they are now.
 * @param layer - The layer, with the tile set the mesh was written with.
 * @param arrays - The mesh's arrays.
 * @param animated - The mesh's animated quads.
 * @param changedFrames - The tile index each animation key whose frame
 * changed now shows, by key. Keys the mesh doesn't hold are ignored.
 * @returns Whether any corner's position changed, which happens when a
 * frame's region is trimmed differently from the last one shown.
 */
export const writeYSortAnimatedQuads = (
  layer: TilemapLayerEcsComponent,
  arrays: TilemapVertexArrays,
  animated: TilemapYSortAnimatedQuads,
  changedFrames: ReadonlyMap<number, number>,
): boolean => {
  let moved = false;

  for (let i = 0; i < animated.animatedQuads.length; i++) {
    const column = animated.animatedCells[i * 2];
    const row = animated.animatedCells[i * 2 + 1];
    const tile = getTile(layer, column, row);
    const frameTileIndex = changedFrames.get(withoutTransformBits(tile));

    if (frameTileIndex === undefined) {
      continue;
    }

    moved =
      writeTile(
        arrays,
        animated.animatedQuads[i],
        layer.tileSet,
        column,
        row,
        tile,
        frameTileIndex,
      ) || moved;
  }

  return moved;
};
