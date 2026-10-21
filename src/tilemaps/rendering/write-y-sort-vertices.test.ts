import { describe, expect, it } from 'vitest';
import { EcsWorld } from '../../ecs/ecs-world.js';
import {
  createIsometricGridLayout,
  createOrthogonalGridLayout,
  GridLayout,
} from '../../math/index.js';
import { getChunkKey } from '../cells/chunk-key.js';
import { fillTiles, setTile } from '../cells/edit-tiles.js';
import {
  addTilemapLayerComponent,
  TilemapLayerEcsComponent,
} from '../components/tilemap-layer-component.js';
import { createTestSource } from '../test-helpers/create-test-tile-set.js';
import { createTileSet, TileDataOptions } from '../tile-set/tile-set.js';
import { packTile } from '../tiles/packed-tile.js';
import {
  createTilemapVertexArrays,
  TilemapVertexArrays,
  writeChunkVertices,
} from './write-chunk-vertices.js';
import {
  collectYSortCells,
  writeYSortAnimatedQuads,
  writeYSortVertices,
  YSortCells,
} from './write-y-sort-vertices.js';

const orthogonal16 = (): GridLayout =>
  createOrthogonalGridLayout({ cellWidth: 16, cellHeight: 16 });

const createLayer = (
  layout: GridLayout = orthogonal16(),
  tiles?: ReadonlyMap<number, TileDataOptions>,
): TilemapLayerEcsComponent => {
  const world = new EcsWorld();
  const tileSet = createTileSet({
    layout,
    sources: [createTestSource(2, 2, { tiles }), createTestSource(2, 1)],
  });

  return addTilemapLayerComponent(world, world.createEntity(), { tileSet });
};

const cellsOf = (
  cells: YSortCells,
): { column: number; row: number; sortY: number }[] =>
  Array.from({ length: cells.count }, (_, i) => ({
    column: cells.columns[i],
    row: cells.rows[i],
    sortY: cells.sortYs[i],
  }));

const grass = packTile({ source: 0, tile: 0 });
const tree = packTile({ source: 0, tile: 1 });
const water = packTile({ source: 0, tile: 3 });
const rock = packTile({ source: 1, tile: 0 });

describe('collectYSortCells', () => {
  it('groups an orthogonal layer into grid rows, each in column order', () => {
    const layer = createLayer();

    fillTiles(layer, 0, 0, 3, 2, grass);
    setTile(layer, 1, 0, rock);
    // A cell in another chunk, in the first row.
    setTile(layer, 40, 0, grass);

    const cells = collectYSortCells(layer, 0);

    expect(cellsOf(cells)).toEqual([
      { column: 0, row: 0, sortY: 8 },
      { column: 2, row: 0, sortY: 8 },
      { column: 40, row: 0, sortY: 8 },
      { column: 0, row: 1, sortY: 24 },
      { column: 1, row: 1, sortY: 24 },
      { column: 2, row: 1, sortY: 24 },
    ]);
    expect([...cells.tiles]).toEqual(new Array(6).fill(grass));
    expect([...cells.chunkKeys].sort((a, b) => a - b)).toEqual([
      getChunkKey(0, 0),
      getChunkKey(1, 0),
    ]);
    expect(cellsOf(collectYSortCells(layer, 1))).toEqual([
      { column: 1, row: 0, sortY: 8 },
    ]);
  });

  it('puts isometric cells with the same column + row in one row, across chunks and negative cells', () => {
    const layer = createLayer(
      createIsometricGridLayout({ cellWidth: 32, cellHeight: 16 }),
    );

    setTile(layer, 0, 1, grass);
    setTile(layer, 1, 0, grass);
    setTile(layer, -1, 2, grass);
    setTile(layer, 33, -32, grass);
    setTile(layer, 0, 0, grass);

    expect(cellsOf(collectYSortCells(layer, 0))).toEqual([
      { column: 0, row: 0, sortY: 8 },
      { column: 33, row: -32, sortY: 16 },
      { column: 1, row: 0, sortY: 16 },
      { column: 0, row: 1, sortY: 16 },
      { column: -1, row: 2, sortY: 16 },
    ]);
  });

  it('splits a grid row by its tiles’ ySortOrigin, in sort order', () => {
    const layer = createLayer(
      orthogonal16(),
      new Map([[1, { ySortOrigin: 8 }]]),
    );

    fillTiles(layer, 0, 0, 3, 2, grass);
    // A tree sorts at its cell's bottom edge, with the row below's top.
    setTile(layer, 1, 0, tree);

    expect(cellsOf(collectYSortCells(layer, 0))).toEqual([
      { column: 0, row: 0, sortY: 8 },
      { column: 2, row: 0, sortY: 8 },
      { column: 1, row: 0, sortY: 16 },
      { column: 0, row: 1, sortY: 24 },
      { column: 1, row: 1, sortY: 24 },
      { column: 2, row: 1, sortY: 24 },
    ]);
  });
});

describe('writeYSortVertices', () => {
  const write = (
    layer: TilemapLayerEcsComponent,
    source: number = 0,
    timeInMilliseconds: number = 0,
  ): {
    arrays: TilemapVertexArrays;
    written: ReturnType<typeof writeYSortVertices>;
  } => {
    const cells = collectYSortCells(layer, source);
    const arrays = createTilemapVertexArrays(cells.count);

    return {
      arrays,
      written: writeYSortVertices(
        layer.tileSet,
        cells,
        arrays,
        timeInMilliseconds,
      ),
    };
  };

  it('writes one section per sort row, following on', () => {
    const layer = createLayer();

    fillTiles(layer, 0, 0, 3, 1, grass);
    setTile(layer, 5, 2, grass);
    fillTiles(layer, 0, 4, 2, 1, grass);

    const { written } = write(layer);

    expect(written.sortYs).toEqual([8, 40, 72]);
    expect(written.sections).toEqual([
      { start: 0, count: 18 },
      { start: 18, count: 6 },
      { start: 24, count: 12 },
    ]);
  });

  it('writes the same quads as the chunk writer, for every transform', () => {
    const layer = createLayer();
    const tiles = [false, true].flatMap((transpose) =>
      [false, true].flatMap((flipX) =>
        [false, true].map((flipY) =>
          packTile({ source: 0, tile: 1, flipX, flipY, transpose }),
        ),
      ),
    );

    // One grid row, so both writers write the cells in the same order.
    for (const [column, tile] of tiles.entries()) {
      setTile(layer, column, 0, tile);
    }

    const { arrays } = write(layer);
    const chunk = [...layer.chunks.values()][0];
    const chunkArrays = createTilemapVertexArrays(chunk.tileCount);

    writeChunkVertices(layer.tileSet, chunk, 0, chunkArrays, 0);

    expect(arrays).toEqual(chunkArrays);
  });

  it('records the animated quads by cell, and each animated tile once', () => {
    const layer = createLayer(
      orthogonal16(),
      new Map([
        [
          3,
          {
            animation: [
              { tile: 3, durationMilliseconds: 100 },
              { tile: 1, durationMilliseconds: 100 },
            ],
          },
        ],
      ]),
    );

    setTile(layer, 0, 1, water);
    setTile(layer, 4, 0, grass);
    setTile(layer, -2, 0, packTile({ source: 0, tile: 3, flipX: true }));

    const { written } = write(layer);

    // Row 0 first: (-2, 0) is quad 0, (4, 0) quad 1, then (0, 1) quad 2.
    expect([...written.animatedQuads]).toEqual([0, 2]);
    expect([...written.animatedCells]).toEqual([-2, 0, 0, 1]);
    expect(written.animatedTiles).toEqual([water]);
  });

  it('rewrites only the animated quads whose frame changed', () => {
    const layer = createLayer(
      orthogonal16(),
      new Map([
        [
          3,
          {
            animation: [
              { tile: 3, durationMilliseconds: 100 },
              { tile: 1, durationMilliseconds: 100 },
            ],
          },
        ],
      ]),
    );

    setTile(layer, 0, 0, grass);
    setTile(layer, 1, 0, water);

    const { arrays, written } = write(layer, 0, 0);
    const expected = write(layer, 0, 100).arrays;

    writeYSortAnimatedQuads(layer, arrays, written, new Map([[water, 1]]));

    expect(arrays).toEqual(expected);
  });
});
